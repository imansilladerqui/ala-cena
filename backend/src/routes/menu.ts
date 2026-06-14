import { Router } from 'express'
import { pool } from '../db'
import { findRecipesByIngredients } from '../services/spoonacular'
import { personalizeMenu } from '../services/claude'
import { applyDeductions, previewDeductions } from '../services/pantryDeduction'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/AppError'
import type { IngredientRef, MenuProposal } from '../types/api'

export const menuRouter = Router()

menuRouter.get(
  '/today',
  asyncHandler(async (_req, res) => {
    const { rows: cached } = await pool.query(
      `SELECT recipes FROM menu_proposals WHERE proposed_at = CURRENT_DATE ORDER BY id DESC LIMIT 1`
    )
    if (cached[0]) {
      const recipes = cached[0].recipes as MenuProposal[]
      if (recipes.every(r => r.missedIngredientCount === 0)) {
        res.json({ proposals: recipes })
        return
      }
    }

    const { rows: pantry } = await pool.query('SELECT name FROM pantry WHERE quantity > 0')
    if (pantry.length === 0) {
      throw new AppError(400, 'La alacena está vacía', 'EMPTY_PANTRY')
    }

    const { rows: history } = await pool.query(`
      SELECT recipe_title FROM history
      WHERE cooked_at > NOW() - INTERVAL '7 days'
    `)

    const { rows: profiles } = await pool.query('SELECT name, restrictions FROM profiles')

    const pantryNames = pantry.map((p: { name: string }) => p.name)
    const rawRecipes = await findRecipesByIngredients(pantryNames)

    if (rawRecipes.length === 0) {
      throw new AppError(
        404,
        'No hay recetas que se puedan hacer solo con lo que tienes en la alacena',
        'NO_COMPLETE_RECIPES'
      )
    }

    const ordered = await personalizeMenu({
      recipes: rawRecipes,
      profiles,
      recentHistory: history.map((h: { recipe_title: string }) => h.recipe_title),
    })

    await pool.query('INSERT INTO menu_proposals (recipes) VALUES ($1)', [
      JSON.stringify(ordered),
    ])

    res.json({ proposals: ordered })
  })
)

menuRouter.post(
  '/choose/preview',
  asyncHandler(async (req, res) => {
    const { usedIngredients } = req.body as { recipeId?: string; usedIngredients: IngredientRef[] }
    if (!Array.isArray(usedIngredients) || usedIngredients.length === 0) {
      throw new AppError(400, 'Se requieren ingredientes', 'VALIDATION_ERROR')
    }
    const deductions = await previewDeductions(usedIngredients)
    res.json({ deductions })
  })
)

menuRouter.post(
  '/choose',
  asyncHandler(async (req, res) => {
    const { recipeId, recipeTitle, ingredients } = req.body
    if (!recipeId || !recipeTitle) {
      throw new AppError(400, 'recipeId y recipeTitle son obligatorios', 'VALIDATION_ERROR')
    }
    if (!Array.isArray(ingredients)) {
      throw new AppError(400, 'ingredients debe ser un array', 'VALIDATION_ERROR')
    }

    await pool.query(
      'INSERT INTO history (recipe_id, recipe_title) VALUES ($1, $2)',
      [String(recipeId), recipeTitle]
    )

    await applyDeductions(ingredients)

    await pool.query(
      `UPDATE menu_proposals SET chosen_recipe_id = $1
       WHERE proposed_at = CURRENT_DATE AND id = (
         SELECT id FROM menu_proposals WHERE proposed_at = CURRENT_DATE ORDER BY id DESC LIMIT 1
       )`,
      [String(recipeId)]
    )

    res.json({ ok: true, message: `"${recipeTitle}" registrado. Alacena actualizada.` })
  })
)

menuRouter.post(
  '/rate',
  asyncHandler(async (req, res) => {
    const { recipeId, rating } = req.body
    if (!recipeId) throw new AppError(400, 'recipeId es obligatorio', 'VALIDATION_ERROR')
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new AppError(400, 'La puntuación debe ser un entero entre 1 y 5', 'VALIDATION_ERROR')
    }

    const { rowCount } = await pool.query(
      `UPDATE history SET rating = $1
       WHERE recipe_id = $2
       AND cooked_at = (SELECT MAX(cooked_at) FROM history WHERE recipe_id = $2)`,
      [rating, String(recipeId)]
    )
    if (!rowCount) throw new AppError(404, 'No hay historial para esta receta', 'NOT_FOUND')
    res.json({ ok: true })
  })
)
