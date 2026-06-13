export interface PantryItem {
  id: number
  name: string
  quantity: number
  unit: string | null
  expires_at: string | null
  updated_at: string
}

export interface ScannedItem {
  name: string
  quantity: number
  unit: string | null
}

export interface Profile {
  id: number
  name: string
  restrictions: string[]
  created_at: string
}

export interface IngredientRef {
  id?: number
  name: string
  amount: number
  unit?: string
  image?: string
  original?: string
}

export interface IngredientSummary {
  have: number
  need: number
}

export interface MenuProposal {
  id: number
  title: string
  image: string
  usedIngredientCount: number
  missedIngredientCount: number
  usedIngredients: IngredientRef[]
  missedIngredients: IngredientRef[]
  ingredientSummary: IngredientSummary
}

export interface DeductionPreview {
  pantryId: number
  name: string
  quantityAvailable: number
  quantityToDeduct: number
  unit: string | null
}

export interface ErrorResponse {
  error: string
  code?: string
}
