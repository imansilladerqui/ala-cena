import type { Request, Response, NextFunction } from 'express'
import axios from 'axios'
import { AppError } from '../utils/AppError'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
    })
  }

  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 502
    const message =
      (err.response?.data as { error?: string })?.error ??
      err.message ??
      'Error en servicio externo'
    return res.status(status >= 400 && status < 600 ? status : 502).json({
      error: message,
      code: 'EXTERNAL_API_ERROR',
    })
  }

  console.error(err)
  return res.status(500).json({ error: 'Error interno del servidor' })
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Ruta no encontrada' })
}
