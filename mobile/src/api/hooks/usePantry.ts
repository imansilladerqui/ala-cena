import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { ScannedItem } from '../../types/api'

export function usePantry() {
  return useQuery({
    queryKey: ['pantry'],
    queryFn: api.getPantry,
  })
}

export function useAddPantryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.addPantryItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pantry'] }),
  })
}

export function useUpdatePantryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) =>
      api.updatePantryItem(id, quantity),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pantry'] }),
  })
}

export function useDeletePantryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deletePantryItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pantry'] }),
  })
}

export function useScanTicket() {
  return useMutation({
    mutationFn: (imageBase64: string) => api.scanTicket(imageBase64),
  })
}

export function useConfirmScan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: ScannedItem[]) => api.confirmScan(items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pantry'] }),
  })
}
