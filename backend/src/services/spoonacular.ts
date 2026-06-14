import axios from 'axios'
import type { MenuProposal } from '../types/api'
import { pantryToSearchTerms, toSpanishIngredient } from './ingredients'

const BASE = 'https://api.spoonacular.com'
const KEY = process.env.SPOONACULAR_API_KEY

function localizeIngredients(
  ingredients: MenuProposal['usedIngredients']
): MenuProposal['usedIngredients'] {
  return ingredients.map(ing => ({
    ...ing,
    name: toSpanishIngredient(ing.name),
    original: ing.original ?? ing.name,
  }))
}

export function enrichRecipe(recipe: Record<string, unknown>): MenuProposal {
  const used = Number(recipe.usedIngredientCount ?? 0)
  const missed = Number(recipe.missedIngredientCount ?? 0)
  const usedIngredients = (recipe.usedIngredients as MenuProposal['usedIngredients']) ?? []
  const missedIngredients = (recipe.missedIngredients as MenuProposal['missedIngredients']) ?? []

  return {
    id: Number(recipe.id),
    title: String(recipe.title),
    image: String(recipe.image ?? ''),
    usedIngredientCount: used,
    missedIngredientCount: missed,
    usedIngredients: localizeIngredients(usedIngredients),
    missedIngredients: missedIngredients.map(ing => ({
      ...ing,
      name: toSpanishIngredient(ing.name),
      original: ing.original ?? ing.name,
    })),
    ingredientSummary: { have: used, need: used + missed },
  }
}

export async function findRecipesByIngredients(pantryNames: string[]): Promise<MenuProposal[]> {
  const searchTerms = pantryToSearchTerms(pantryNames)
  if (searchTerms.length === 0) return []

  const { data } = await axios.get(`${BASE}/recipes/findByIngredients`, {
    params: {
      apiKey: KEY,
      ingredients: searchTerms.join(','),
      number: 30,
      ranking: 1,
      ignorePantry: true,
    },
  })

  return (data as Record<string, unknown>[])
    .map(enrichRecipe)
    .filter(recipe => recipe.missedIngredientCount === 0)
    .slice(0, 5)
}

export async function getRecipeDetails(id: number): Promise<Record<string, unknown>> {
  const { data } = await axios.get(`${BASE}/recipes/${id}/information`, {
    params: { apiKey: KEY, includeNutrition: false },
  })
  return data
}
