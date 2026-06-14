import axios from 'axios'
import type { ScannedItem } from '../types/api'
import { normalizePantryName } from './ingredients'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

export async function parseTicketWithAi(ocrText: string): Promise<ScannedItem[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const prompt = `Analiza este texto OCR de un ticket de supermercado en Catalunya/España (a menudo Lidl, Mercadona, etc., en catalán o castellano).

Formato típico Lidl por línea:
NOMBRE_PRODUCTO [precio_unitario x cantidad] precio_total LETRA
La letra final (A, B o C) es tipo de IVA — IGNÓRALA.
Ejemplo: "CRISPIES POLLASTRE 4,79x 2 9,58 B" → nombre "Crispies pollo", quantity 2, unit "ud"
Ejemplo: "TOMAQUET CHERRY 2,19 A" → nombre "Tomate cherry", quantity 1, unit "ud"

OMITE siempre:
- Descuentos y promociones (Desc., PROMO LIDL PLUS, importes negativos)
- Totales, IVA, formas de pago, cabecera de tienda, fechas
- Productos no alimenticios (pasta de dientes, velas, etc.)

Para cada producto alimenticio:
- "name": nombre en ESPAÑOL, legible (traduce del catalán)
- "quantity": unidades compradas (del "x 2" si existe; si no, 1)
- "unit": "kg", "g", "l", "ml", "ud" o null

Corrige errores de OCR. Responde SOLO un array JSON válido, sin markdown:
[{"name":"Tomate cherry","quantity":1,"unit":"ud"}]

Texto OCR:
${ocrText.slice(0, 8000)}`

  try {
    const { data } = await axios.post(
      ANTHROPIC_URL,
      {
        model: 'claude-haiku-4-5',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        timeout: 30_000,
      }
    )

    const text: string = data.content?.[0]?.text?.trim() ?? ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0]) as unknown
    if (!Array.isArray(parsed)) return null

    const items: ScannedItem[] = parsed
      .filter(
        (row): row is { name: string; quantity?: number; unit?: string | null } =>
          typeof row === 'object' &&
          row !== null &&
          typeof (row as { name?: unknown }).name === 'string' &&
          (row as { name: string }).name.trim().length > 1
      )
      .map(row => ({
        name: normalizePantryName(row.name.trim()),
        quantity: typeof row.quantity === 'number' && row.quantity > 0 ? row.quantity : 1,
        unit: row.unit && typeof row.unit === 'string' ? row.unit.toLowerCase() : null,
      }))

    return items.length > 0 ? items : null
  } catch {
    return null
  }
}
