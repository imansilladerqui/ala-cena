import type {
  DeductionPreview,
  MenuProposal,
  PantryItem,
  Profile,
  ScannedItem,
} from '../types/api'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? 'Error de red')
  }

  return res.json() as Promise<T>
}

export const api = {
  getPantry: () => request<PantryItem[]>('/pantry'),

  addPantryItem: (data: { name: string; quantity?: number; unit?: string; expires_at?: string }) =>
    request<PantryItem>('/pantry', { method: 'POST', body: JSON.stringify(data) }),

  updatePantryItem: (id: number, quantity: number) =>
    request<PantryItem | { deleted: true }>(`/pantry/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),

  deletePantryItem: (id: number) =>
    request<{ ok: boolean }>(`/pantry/${id}`, { method: 'DELETE' }),

  scanTicket: (imageBase64: string) =>
    request<{ detected: ScannedItem[] }>('/pantry/scan', {
      method: 'POST',
      body: JSON.stringify({ imageBase64 }),
    }),

  confirmScan: (items: ScannedItem[]) =>
    request<PantryItem[]>('/pantry/scan/confirm', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  getTodayMenu: () => request<{ proposals: MenuProposal[] }>('/menu/today'),

  previewChoose: (usedIngredients: { name: string; amount: number; unit?: string }[]) =>
    request<{ deductions: DeductionPreview[] }>('/menu/choose/preview', {
      method: 'POST',
      body: JSON.stringify({ usedIngredients }),
    }),

  chooseRecipe: (data: {
    recipeId: string | number
    recipeTitle: string
    ingredients: { name: string; amount: number; unit?: string }[]
  }) =>
    request<{ ok: boolean; message: string }>('/menu/choose', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  rateRecipe: (recipeId: string | number, rating: number) =>
    request<{ ok: boolean }>('/menu/rate', {
      method: 'POST',
      body: JSON.stringify({ recipeId: String(recipeId), rating }),
    }),

  getProfiles: () => request<Profile[]>('/profiles'),

  createProfile: (data: { name: string; restrictions?: string[] }) =>
    request<Profile>('/profiles', { method: 'POST', body: JSON.stringify(data) }),

  updateProfile: (id: number, data: { name?: string; restrictions?: string[] }) =>
    request<Profile>(`/profiles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteProfile: (id: number) =>
    request<{ ok: boolean }>(`/profiles/${id}`, { method: 'DELETE' }),
}
