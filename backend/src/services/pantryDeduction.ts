import { pool } from '../db'
import type { DeductionPreview, IngredientRef } from '../types/api'

export async function previewDeductions(
  ingredients: IngredientRef[]
): Promise<DeductionPreview[]> {
  const { rows: pantry } = await pool.query(
    'SELECT id, name, quantity, unit FROM pantry WHERE quantity > 0'
  )

  const deductions: DeductionPreview[] = []

  for (const ingredient of ingredients) {
    const amount = ingredient.amount || 1
    const match = pantry.find((p: { name: string }) =>
      p.name.toLowerCase().includes(ingredient.name.toLowerCase()) ||
      ingredient.name.toLowerCase().includes(p.name.toLowerCase())
    )

    if (match) {
      deductions.push({
        pantryId: match.id,
        name: match.name,
        quantityAvailable: Number(match.quantity),
        quantityToDeduct: Math.min(amount, Number(match.quantity)),
        unit: match.unit,
      })
    }
  }

  return deductions
}

export async function applyDeductions(ingredients: IngredientRef[]): Promise<void> {
  for (const ingredient of ingredients) {
    const amount = ingredient.amount || 1
    await pool.query(
      `UPDATE pantry
       SET quantity = GREATEST(quantity - $1, 0), updated_at = NOW()
       WHERE name ILIKE $2`,
      [amount, `%${ingredient.name}%`]
    )
  }
  await pool.query('DELETE FROM pantry WHERE quantity <= 0')
}
