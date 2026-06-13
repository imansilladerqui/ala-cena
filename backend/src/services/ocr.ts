import axios from 'axios'
import fs from 'fs'
import type { ScannedItem } from '../types/api'
import { AppError } from '../utils/AppError'

function getVisionApiKey(): string {
  if (process.env.GOOGLE_VISION_API_KEY) {
    return process.env.GOOGLE_VISION_API_KEY
  }

  if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
    const creds = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS)
    if (creds.api_key) return creds.api_key
  }

  const keyFile = process.env.GOOGLE_CLOUD_KEY_FILE
  if (keyFile && fs.existsSync(keyFile)) {
    const creds = JSON.parse(fs.readFileSync(keyFile, 'utf-8'))
    if (creds.api_key) return creds.api_key
  }

  throw new AppError(
    503,
    'Google Vision no configurado. Define GOOGLE_VISION_API_KEY, GOOGLE_CLOUD_CREDENTIALS o GOOGLE_CLOUD_KEY_FILE',
    'VISION_NOT_CONFIGURED'
  )
}

function parseTicketLine(line: string): ScannedItem {
  const trimmed = line.trim()

  const qtyUnitMatch = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|ud|u|un)?\s+(.+)$/i)
  if (qtyUnitMatch) {
    return {
      quantity: parseFloat(qtyUnitMatch[1]!.replace(',', '.')),
      unit: qtyUnitMatch[2]?.toLowerCase() ?? null,
      name: qtyUnitMatch[3]!.trim(),
    }
  }

  const trailingQty = trimmed.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml)?$/i)
  if (trailingQty) {
    return {
      name: trailingQty[1]!.trim(),
      quantity: parseFloat(trailingQty[2]!.replace(',', '.')),
      unit: trailingQty[3]?.toLowerCase() ?? null,
    }
  }

  return { name: trimmed, quantity: 1, unit: null }
}

export async function extractTicketItems(imageBase64: string): Promise<ScannedItem[]> {
  const apiKey = getVisionApiKey()
  const base64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')

  const { data } = await axios.post(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      requests: [{
        image: { content: base64 },
        features: [{ type: 'TEXT_DETECTION' }],
      }],
    }
  )

  const fullText: string = data.responses?.[0]?.fullTextAnnotation?.text ?? ''
  if (!fullText) {
    throw new AppError(422, 'No se detectó texto en la imagen', 'NO_TEXT_DETECTED')
  }

  const products = fullText
    .split('\n')
    .map((line: string) => line.trim())
    .filter((line: string) =>
      line.length > 2 &&
      /[a-záéíóúñA-ZÁÉÍÓÚÑ]/.test(line) &&
      !/^(total|iva|subtotal|ticket|fecha|caja|efectivo|tarjeta|cambio)/i.test(line) &&
      !/^\d+[.,]\d{2}\s*€?$/.test(line)
    )
    .map(parseTicketLine)

  return products
}
