import type { ScannedItem } from '../types/api'

let pendingScanItems: ScannedItem[] = []

export function setPendingScanItems(items: ScannedItem[]) {
  pendingScanItems = items
}

export function getPendingScanItems(): ScannedItem[] {
  return pendingScanItems
}

export function clearPendingScanItems() {
  pendingScanItems = []
}
