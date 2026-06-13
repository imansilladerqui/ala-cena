import axios from 'axios'
import type { MenuProposal } from '../types/api'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

interface MenuContext {
  recipes: MenuProposal[]
  profiles: { name: string; restrictions: string[] }[]
  recentHistory: string[]
}

export async function personalizeMenu(ctx: MenuContext): Promise<MenuProposal[]> {
  if (ctx.recipes.length === 0) return []

  const prompt = `
Tienes estas ${ctx.recipes.length} recetas posibles basadas en los ingredientes disponibles:
${ctx.recipes.map((r, i) => `${i + 1}. ${r.title} (ingredientes que faltan: ${r.missedIngredientCount})`).join('\n')}

Perfiles de la casa:
${ctx.profiles.map(p => `- ${p.name}: restricciones [${p.restrictions.join(', ') || 'ninguna'}]`).join('\n')}

Cocinado esta semana (no repetir):
${ctx.recentHistory.join(', ') || 'nada aún'}

Devuelve SOLO un array JSON con los índices de las 5 recetas ordenadas de mejor a peor opción para hoy.
Prioriza variedad, que nadie tenga restricciones con esa receta, y que no se repita lo de esta semana.
Ejemplo de respuesta válida: [3, 1, 5, 2, 4]
`

  try {
    const { data } = await axios.post(
      ANTHROPIC_URL,
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
      }
    )

    const text = data.content[0].text.trim()
    const jsonMatch = text.match(/\[[\d,\s]+\]/)
    const order: number[] = JSON.parse(jsonMatch?.[0] ?? text)
    const ordered = order.map(i => ctx.recipes[i - 1]).filter(Boolean) as MenuProposal[]

    if (ordered.length > 0) return ordered
  } catch {
    // fallback to Spoonacular order
  }

  return ctx.recipes
}
