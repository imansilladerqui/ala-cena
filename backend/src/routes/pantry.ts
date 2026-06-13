import { Router } from 'express'
import { pool } from '../db'
import { extractTicketItems } from '../services/ocr'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/AppError'
import type { ScannedItem } from '../types/api'

export const pantryRouter = Router()

pantryRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(
      'SELECT * FROM pantry ORDER BY expires_at ASC NULLS LAST'
    )
    res.json(rows)
  })
)

pantryRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, quantity, unit, expires_at } = req.body
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError(400, 'El nombre es obligatorio', 'VALIDATION_ERROR')
    }
    const { rows } = await pool.query(
      'INSERT INTO pantry (name, quantity, unit, expires_at) VALUES ($1, $2, $3, $4) RETURNING *',
      [name.trim(), quantity ?? 1, unit ?? null, expires_at ?? null]
    )
    res.status(201).json(rows[0])
  })
)

pantryRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { quantity } = req.body
    if (quantity === undefined || typeof quantity !== 'number' || isNaN(quantity)) {
      throw new AppError(400, 'La cantidad debe ser un número', 'VALIDATION_ERROR')
    }

    if (quantity <= 0) {
      const { rowCount } = await pool.query('DELETE FROM pantry WHERE id = $1', [req.params.id])
      if (!rowCount) throw new AppError(404, 'Producto no encontrado', 'NOT_FOUND')
      res.json({ deleted: true })
      return
    }

    const { rows } = await pool.query(
      'UPDATE pantry SET quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [quantity, req.params.id]
    )
    if (!rows[0]) throw new AppError(404, 'Producto no encontrado', 'NOT_FOUND')
    res.json(rows[0])
  })
)

pantryRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rowCount } = await pool.query('DELETE FROM pantry WHERE id = $1', [req.params.id])
    if (!rowCount) throw new AppError(404, 'Producto no encontrado', 'NOT_FOUND')
    res.json({ ok: true })
  })
)

pantryRouter.post(
  '/scan',
  asyncHandler(async (req, res) => {
    const { imageBase64 } = req.body
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new AppError(400, 'Falta imageBase64', 'VALIDATION_ERROR')
    }
    const items = await extractTicketItems(imageBase64)
    res.json({ detected: items })
  })
)

pantryRouter.post(
  '/scan/confirm',
  asyncHandler(async (req, res) => {
    const { items }: { items: ScannedItem[] } = req.body
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError(400, 'Se requiere al menos un producto', 'VALIDATION_ERROR')
    }
    for (const item of items) {
      if (!item.name?.trim()) {
        throw new AppError(400, 'Cada producto debe tener nombre', 'VALIDATION_ERROR')
      }
    }

    const inserted = await Promise.all(
      items.map(item =>
        pool
          .query(
            'INSERT INTO pantry (name, quantity, unit) VALUES ($1, $2, $3) RETURNING *',
            [item.name.trim(), item.quantity ?? 1, item.unit ?? null]
          )
          .then(r => r.rows[0])
      )
    )
    res.status(201).json(inserted)
  })
)
