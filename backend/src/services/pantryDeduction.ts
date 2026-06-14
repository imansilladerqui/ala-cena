import { pool } from '../db'
import { findPantryMatch } from './ingredients'
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
    const match = findPantryMatch(
      pantry as { id: number; name: string; quantity: number; unit: string | null }[],
      ingredient.name
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
  const { rows: pantry } = await pool.query(
    'SELECT id, name, quantity FROM pantry WHERE quantity > 0'
  )

  for (const ingredient of ingredients) {
    const amount = ingredient.amount || 1
    const match = findPantryMatch(
      pantry as { id: number; name: string }[],
      ingredient.name
    )
    if (!match) continue

    await pool.query(
      `UPDATE pantry
       SET quantity = GREATEST(quantity - $1, 0), updated_at = NOW()
       WHERE id = $2`,
      [amount, match.id]
    )
  }

  await pool.query('DELETE FROM pantry WHERE quantity <= 0')
}
