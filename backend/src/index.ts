import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initDB } from './db'
import { pantryRouter } from './routes/pantry'
import { menuRouter } from './routes/menu'
import { profilesRouter } from './routes/profiles'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { setupSwagger } from './docs/swagger'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/pantry', pantryRouter)
app.use('/menu', menuRouter)
app.use('/profiles', profilesRouter)

app.get('/health', (_req, res) => res.json({ ok: true }))

if (process.env.NODE_ENV !== 'production') {
  setupSwagger(app)
}

app.use(notFoundHandler)
app.use(errorHandler)

const PORT = process.env.PORT || 3000

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend corriendo en puerto ${PORT}`)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Swagger: http://localhost:${PORT}/api-docs`)
      }
    })
  })
  .catch(err => {
    console.error('Error al inicializar la base de datos:', err)
    process.exit(1)
  })
