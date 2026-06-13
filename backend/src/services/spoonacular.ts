import axios from 'axios'
import type { MenuProposal } from '../types/api'

const BASE = 'https://api.spoonacular.com'
const KEY = process.env.SPOONACULAR_API_KEY

export function enrichRecipe(recipe: Record<string, unknown>): MenuProposal {
  const used = Number(recipe.usedIngredientCount ?? 0)
  const missed = Number(recipe.missedIngredientCount ?? 0)
  return {
    id: Number(recipe.id),
    title: String(recipe.title),
    image: String(recipe.image ?? ''),
    usedIngredientCount: used,
    missedIngredientCount: missed,
    usedIngredients: (recipe.usedIngredients as MenuProposal['usedIngredients']) ?? [],
    missedIngredients: (recipe.missedIngredients as MenuProposal['missedIngredients']) ?? [],
    ingredientSummary: { have: used, need: used + missed },
  }
}

export async function findRecipesByIngredients(ingredients: string[]): Promise<MenuProposal[]> {
  const { data } = await axios.get(`${BASE}/recipes/findByIngredients`, {
    params: {
      apiKey: KEY,
      ingredients: ingredients.join(','),
      number: 5,
      ranking: 1,
      ignorePantry: true,
    },
  })
  return (data as Record<string, unknown>[]).map(enrichRecipe)
}

export async function getRecipeDetails(id: number): Promise<Record<string, unknown>> {
  const { data } = await axios.get(`${BASE}/recipes/${id}/information`, {
    params: { apiKey: KEY, includeNutrition: false },
  })
  return data
}
