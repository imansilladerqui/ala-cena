import axios from 'axios'
import fs from 'fs'
import type { ScannedItem } from '../types/api'
import { AppError } from '../utils/AppError'
import { parseTicketWithAi } from './ticketAi'
import { parseTicketText } from './ticketParser'

function getVisionApiKey(): string {
  if (process.env.GOOGLE_VISION_API_KEY) {
    return process.env.GOOGLE_VISION_API_KEY
  }

  if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
    const creds = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS)
    if (creds.api_key) return creds.api_key
  }

  const keyFile = process.env.GOOGLE_CLOUD_KEY_FILE
  if (keyFile && fs.existsSync(keyFile)) {
    const creds = JSON.parse(fs.readFileSync(keyFile, 'utf-8'))
    if (creds.api_key) return creds.api_key
  }

  throw new AppError(
    503,
    'Google Vision no configurado. Define GOOGLE_VISION_API_KEY, GOOGLE_CLOUD_CREDENTIALS o GOOGLE_CLOUD_KEY_FILE',
    'VISION_NOT_CONFIGURED'
  )
}

async function extractTextFromImage(base64: string): Promise<string> {
  const apiKey = getVisionApiKey()

  const { data } = await axios.post(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      requests: [{
        image: { content: base64 },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        imageContext: {
          languageHints: ['ca', 'es'],
        },
      }],
    }
  )

  const response = data.responses?.[0]
  if (response?.error) {
    throw new AppError(502, 'Error de Google Vision', 'VISION_API_ERROR')
  }

  return (
    response?.fullTextAnnotation?.text ??
    response?.textAnnotations?.[0]?.description ??
    ''
  )
}

export async function extractTicketItems(imageBase64: string): Promise<ScannedItem[]> {
  const base64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
  const fullText = await extractTextFromImage(base64)

  if (!fullText.trim()) {
    throw new AppError(422, 'No se detectó texto en la imagen', 'NO_TEXT_DETECTED')
  }

  // IA (si hay ANTHROPIC_API_KEY): mejor con catalán y OCR sucio
  const aiItems = await parseTicketWithAi(fullText)
  if (aiItems && aiItems.length > 0) {
    return aiItems
  }

  // Fallback: reglas + diccionario catalán→español
  const ruleItems = parseTicketText(fullText)
  if (ruleItems.length > 0) {
    return ruleItems
  }

  throw new AppError(
    422,
    'No se detectaron productos en el ticket. Intenta con mejor luz y el ticket completo.',
    'NO_PRODUCTS_DETECTED'
  )
}
