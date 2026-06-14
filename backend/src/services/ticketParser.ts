import type { ScannedItem } from '../types/api'

/** Líneas de ticket (ca/es) que no son productos */
const SKIP_LINE =
  /^(total|subtotal|suma|import|importe|iva|igic|ipoc|base|quota|descompte|descuento|desc\.|dto|promo|ticket|tiquet|recibo|factura|data|fecha|hora|caixa|caja|efectiu|efectivo|targeta|tarjeta|canvi|cambio|gràcies|gracias|merci|obert|tancat|tel|telèfon|telefono|nif|cif|www\.|http|@|visa|mastercard|bizum|ref\.|transacció|transaccion|operaci|client|vendedor|supermercat|supermercado|hipermercat|condicions|condiciones|devoluci|atenció|atencion|entrad|sortid|parking|club|punts|puntos|targeta\s|nº|num\.|c\.p\.|cp\s|lidl\s*plus)/i

const STORE_NAMES =
  /^(mercadona|carrefour|lidl|aldi|eroski|caprabo|bon\s?preu|condis|consum|dia\s|alcampo|el\s+corte|ahorramas|spar|simply)/i

const PRICE_ONLY = /^\d+[.,]\d{2}\s*€?\s*([ABC])?\s*$/i
const BARCODE = /^\d{8,}$/
const DATE_LINE = /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/
const LETTERS = /[a-zàèéíïòóúüçñA-ZÀÈÉÍÏÒÓÚÜÇÑ]/

/** Catalán → español (términos habituales en ticket de super) */
const CA_TO_ES: Record<string, string> = {
  llet: 'leche',
  ous: 'huevos',
  ou: 'huevo',
  pa: 'pan',
  pans: 'panes',
  panet: 'panecillo',
  tomàquet: 'tomate',
  tomaquet: 'tomate',
  tomàquets: 'tomates',
  patata: 'patata',
  patates: 'patatas',
  formatge: 'queso',
  edam: 'queso edam',
  iogurt: 'yogur',
  pollastre: 'pollo',
  vedella: 'ternera',
  porc: 'cerdo',
  peix: 'pescado',
  arròs: 'arroz',
  oli: 'aceite',
  oliva: 'aceituna',
  sucre: 'azúcar',
  llimona: 'limón',
  llimones: 'limones',
  platan: 'plátano',
  plàtan: 'plátano',
  poma: 'manzana',
  pomes: 'manzanas',
  pera: 'pera',
  peres: 'peras',
  enciam: 'lechuga',
  ceba: 'cebolla',
  ceves: 'cebollas',
  all: 'ajo',
  gambes: 'gambas',
  salmó: 'salmón',
  tonyina: 'atún',
  pernil: 'jamón',
  embotit: 'embutido',
  salsitxes: 'salchichas',
  farina: 'harina',
  mantega: 'mantequilla',
  nata: 'nata',
  cafè: 'café',
  te: 'té',
  aigua: 'agua',
  suc: 'zumo',
  pinya: 'piña',
  maduixa: 'fresa',
  maduixes: 'fresas',
  raïm: 'uvas',
  raïms: 'uvas',
  pastanaga: 'zanahoria',
  pastanagues: 'zanahorias',
  cogombre: 'pepino',
  cogombret: 'pepinillo',
  pebrot: 'pimiento',
  pebrots: 'pimientos',
  mongeta: 'judía',
  mongetes: 'judías',
  cigró: 'garbanzo',
  cigrons: 'garbanzos',
  llenties: 'lentejas',
  sèmola: 'sémola',
  pasta: 'pasta',
  macarrons: 'macarrones',
  espaguetis: 'espaguetis',
  sopa: 'sopa',
  brou: 'caldo',
  peixos: 'pescado',
  marisc: 'marisco',
  congelat: 'congelado',
  fresc: 'fresco',
  integral: 'integral',
  sencera: 'entera',
  sencer: 'entero',
  semidesnatada: 'semidesnatada',
  light: 'light',
  zero: 'zero',
  unitat: 'unidad',
  unitats: 'unidades',
  llauna: 'lata',
  ampolla: 'botella',
  bossa: 'bolsa',
  paquet: 'paquete',
  prèssec: 'melocotón',
  pressec: 'melocotón',
  salmorejo: 'salmorejo',
  reganya: 'regaña',
  reganyes: 'regañas',
  aletes: 'alitas',
  blat: 'maíz',
  espetec: 'espetec',
  xocolata: 'chocolate',
  burger: 'hamburguesa',
  meat: 'carne',
}

function normalizeProductName(raw: string): string {
  let name = raw
    .replace(/\s+/g, ' ')
    .replace(/\*+/g, '')
    .replace(/\b\d{5,}\b/g, '')
    .trim()

  const words = name.split(' ')
  const normalized = words.map(word => {
    const lower = word.toLowerCase()
    return CA_TO_ES[lower] ?? word
  })

  name = normalized.join(' ')
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function isDiscountOrPromo(line: string): boolean {
  const t = line.trim()
  if (/^(desc\.?|descompte|promo|lidl\s*plus)/i.test(t)) return true
  if (/-\s*\d+[.,]\d{2}/.test(t)) return true
  if (/^\s*-\d/.test(t)) return true
  return false
}

function isProductLine(line: string): boolean {
  if (line.length < 3) return false
  if (!LETTERS.test(line)) return false
  if (isDiscountOrPromo(line)) return false
  if (SKIP_LINE.test(line)) return false
  if (STORE_NAMES.test(line)) return false
  if (PRICE_ONLY.test(line)) return false
  if (BARCODE.test(line.replace(/\s/g, ''))) return false
  if (DATE_LINE.test(line)) return false
  if (!/[a-zàèéíïòóúüçñ]/i.test(line)) return false
  return true
}

/**
 * Lidl (y similares): NOMBRE [precioUnit x cantidad] precioTotal [A|B|C]
 * La letra final es tipo de IVA — se omite.
 */
function parseLidlLine(line: string): ScannedItem | null {
  const match = line.match(
    /^(.+?)\s+(?:(\d+[.,]\d{2})\s*[xX×]\s*(\d+)\s+)?(\d+[.,]\d{2})\s*([ABC])?\s*$/i
  )
  if (!match) return null

  const name = match[1]!.trim()
  if (name.length < 2 || !LETTERS.test(name)) return null

  const qty = match[3] ? parseInt(match[3], 10) : 1

  return {
    name: normalizeProductName(name),
    quantity: qty > 0 ? qty : 1,
    unit: 'ud',
  }
}

function parseTicketLine(line: string): ScannedItem {
  const lidl = parseLidlLine(line.trim())
  if (lidl) return lidl

  const trimmed = line.trim()

  const weightLeading = trimmed.match(
    /^(\d+(?:[.,]\d+)?)\s*(kg|g|gr|l|ml|cl|ud|u\.?|un\.?)\s+(.+)$/i
  )
  if (weightLeading) {
    return {
      quantity: parseFloat(weightLeading[1]!.replace(',', '.')),
      unit: weightLeading[2]!.toLowerCase().replace(/\./g, ''),
      name: normalizeProductName(weightLeading[3]!),
    }
  }

  const qtyLeading = trimmed.match(/^(\d+)\s*[xX×]\s+(.+)$/i)
  if (qtyLeading) {
    return {
      quantity: parseInt(qtyLeading[1]!, 10),
      unit: null,
      name: normalizeProductName(qtyLeading[2]!),
    }
  }

  return { name: normalizeProductName(trimmed), quantity: 1, unit: null }
}

function dedupeItems(items: ScannedItem[]): ScannedItem[] {
  const seen = new Map<string, ScannedItem>()
  for (const item of items) {
    const key = item.name.toLowerCase()
    const existing = seen.get(key)
    if (existing) {
      existing.quantity += item.quantity
    } else {
      seen.set(key, { ...item })
    }
  }
  return [...seen.values()]
}

export function parseTicketText(fullText: string): ScannedItem[] {
  const lines = fullText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  const products: ScannedItem[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (!isProductLine(line)) continue

    // Mercadona: nombre en una línea, precio en la siguiente
    if (i + 1 < lines.length && PRICE_ONLY.test(lines[i + 1]!)) {
      products.push(parseTicketLine(line))
      continue
    }

    if (/^\d+\s/.test(line) && line.length < 8) continue

    products.push(parseTicketLine(line))
  }

  return dedupeItems(products).filter(p => p.name.length >= 2)
}
