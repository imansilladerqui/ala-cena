import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { IngredientRef } from '../../types/api'

export function useTodayMenu() {
  return useQuery({
    queryKey: ['menu'],
    queryFn: async () => {
      const data = await api.getTodayMenu()
      return data.proposals
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useChoosePreview() {
  return useMutation({
    mutationFn: (usedIngredients: IngredientRef[]) => api.previewChoose(usedIngredients),
  })
}

export function useChooseRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.chooseRecipe,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pantry'] })
      qc.invalidateQueries({ queryKey: ['menu'] })
    },
  })
}

export function useRateRecipe() {
  return useMutation({
    mutationFn: ({ recipeId, rating }: { recipeId: string | number; rating: number }) =>
      api.rateRecipe(recipeId, rating),
  })
}
