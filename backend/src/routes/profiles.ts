import { Router } from 'express'
import { pool } from '../db'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/AppError'

export const profilesRouter = Router()

profilesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query('SELECT * FROM profiles ORDER BY id')
    res.json(rows)
  })
)

profilesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, restrictions } = req.body
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError(400, 'El nombre es obligatorio', 'VALIDATION_ERROR')
    }
    const { rows } = await pool.query(
      'INSERT INTO profiles (name, restrictions) VALUES ($1, $2) RETURNING *',
      [name.trim(), restrictions ?? []]
    )
    res.status(201).json(rows[0])
  })
)

profilesRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { name, restrictions } = req.body
    if (restrictions === undefined && name === undefined) {
      throw new AppError(400, 'Nada que actualizar', 'VALIDATION_ERROR')
    }

    const { rows } = await pool.query(
      `UPDATE profiles SET
         name = COALESCE($1, name),
         restrictions = COALESCE($2, restrictions)
       WHERE id = $3 RETURNING *`,
      [name?.trim() ?? null, restrictions ?? null, req.params.id]
    )
    if (!rows[0]) throw new AppError(404, 'Perfil no encontrado', 'NOT_FOUND')
    res.json(rows[0])
  })
)

profilesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rowCount } = await pool.query('DELETE FROM profiles WHERE id = $1', [req.params.id])
    if (!rowCount) throw new AppError(404, 'Perfil no encontrado', 'NOT_FOUND')
    res.json({ ok: true })
  })
)
