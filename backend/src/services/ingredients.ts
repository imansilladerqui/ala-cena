/**
 * Puente lingüístico alacena (ca/es) ↔ Spoonacular (en) ↔ deducciones.
 */

const NOISE_WORDS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'con', 'sin', 'para', 'i', 'y', 'en', 'al',
  'extra', 'reserva', 'serra', 'oscar', 'mayer', 'nova', 'plus', 'acc', 'cuit', 'mini',
  'finest', 'classic', 'original', 'natural', 'bio', 'fresh', 'fresc', 'fresco',
  'semidesnatada', 'desnatada', 'sencera', 'sencer', 'entera', 'entero', 'light', 'zero',
  '2', 'kg', 'gr', 'ml', 'ud', 'un', 'pack', 'format', 'family', 'tall', 'fi', 'dolç',
  'oli', 'girasol', 'menta', 'perfumada', 'triple', 'cherry', 'hot', 'dog', 'meat',
  'burger', 'pagès', 'pagès', 's', 'x', 'l', 'g', 'vermella', 'vermelles', 'meitats',
  'agredol', 'cogombret', 'cogombret', 'pollastre', 'porc', 'vedella',
])

/** Catalán → español (palabra a palabra en tickets) */
export const CA_TO_ES: Record<string, string> = {
  llet: 'leche',
  ous: 'huevos',
  ou: 'huevo',
  pa: 'pan',
  pans: 'pan',
  panet: 'pan',
  tomàquet: 'tomate',
  tomaquet: 'tomate',
  tomàquets: 'tomate',
  patata: 'patata',
  patates: 'patata',
  formatge: 'queso',
  edam: 'queso',
  iogurt: 'yogur',
  pollastre: 'pollo',
  vedella: 'ternera',
  porc: 'cerdo',
  peix: 'pescado',
  arròs: 'arroz',
  oli: 'aceite',
  sucre: 'azúcar',
  llimona: 'limón',
  platan: 'plátano',
  plàtan: 'plátano',
  poma: 'manzana',
  pera: 'pera',
  enciam: 'lechuga',
  ceba: 'cebolla',
  all: 'ajo',
  gambes: 'gambas',
  salmó: 'salmón',
  tonyina: 'atún',
  pernil: 'jamón',
  embotit: 'embutido',
  salsitxes: 'salchicha',
  farina: 'harina',
  mantega: 'mantequilla',
  cafè: 'café',
  aigua: 'agua',
  suc: 'zumo',
  pinya: 'piña',
  maduixa: 'fresa',
  raïm: 'uvas',
  pastanaga: 'zanahoria',
  cogombre: 'pepino',
  pebrot: 'pimiento',
  mongeta: 'judía',
  cigró: 'garbanzo',
  llenties: 'lenteja',
  pasta: 'pasta',
  macarrons: 'pasta',
  espaguetis: 'pasta',
  brou: 'caldo',
  marisc: 'marisco',
  prèssec: 'melocotón',
  pressec: 'melocotón',
  salmorejo: 'salmorejo',
  reganyes: 'pan',
  aletes: 'pollo',
  blat: 'maíz',
  espetec: 'salchicha',
  xocolata: 'chocolate',
  crispies: 'pollo',
}

/** Grupos de equivalencia: español (UI/alacena) ↔ inglés (Spoonacular) */
const INGREDIENT_GROUPS: { es: string; en: string; tokens: string[] }[] = [
  { es: 'leche', en: 'milk', tokens: ['leche', 'llet', 'milk', 'lacteo', 'dairy'] },
  { es: 'huevo', en: 'egg', tokens: ['huevo', 'huevos', 'ou', 'ous', 'egg', 'eggs'] },
  { es: 'pan', en: 'bread', tokens: ['pan', 'pa', 'pans', 'panet', 'bread', 'reganya', 'reganyas', 'hot dog bun', 'bun'] },
  { es: 'tomate', en: 'tomato', tokens: ['tomate', 'tomates', 'tomaquet', 'tomàquet', 'tomato', 'cherry'] },
  { es: 'patata', en: 'potato', tokens: ['patata', 'patatas', 'potato', 'potatoes'] },
  { es: 'queso', en: 'cheese', tokens: ['queso', 'formatge', 'cheese', 'edam'] },
  { es: 'pollo', en: 'chicken', tokens: ['pollo', 'pollastre', 'chicken', 'crispies', 'aletes', 'alitas', 'wings'] },
  { es: 'ternera', en: 'beef', tokens: ['ternera', 'vedella', 'beef', 'steak'] },
  { es: 'cerdo', en: 'pork', tokens: ['cerdo', 'porc', 'pork', 'ham', 'burger'] },
  { es: 'pescado', en: 'fish', tokens: ['pescado', 'peix', 'fish'] },
  { es: 'atún', en: 'tuna', tokens: ['atun', 'atún', 'tonyina', 'tuna'] },
  { es: 'jamón', en: 'ham', tokens: ['jamon', 'jamón', 'pernil', 'ham', 'serrano', 'cuit'] },
  { es: 'salchicha', en: 'sausage', tokens: ['salchicha', 'salchichas', 'salsitxa', 'espetec', 'sausage', 'oscar', 'mayer'] },
  { es: 'arroz', en: 'rice', tokens: ['arroz', 'arros', 'rice'] },
  { es: 'aceite', en: 'oil', tokens: ['aceite', 'oli', 'oil', 'olive', 'girasol', 'sunflower'] },
  { es: 'cebolla', en: 'onion', tokens: ['cebolla', 'ceba', 'onion', 'vermella', 'vermelles'] },
  { es: 'ajo', en: 'garlic', tokens: ['ajo', 'all', 'garlic'] },
  { es: 'pimiento', en: 'pepper', tokens: ['pimiento', 'pebrot', 'pepper', 'bell'] },
  { es: 'pepino', en: 'cucumber', tokens: ['pepino', 'cogombre', 'cogombret', 'cucumber', 'pickle', 'pickles'] },
  { es: 'lechuga', en: 'lettuce', tokens: ['lechuga', 'enciam', 'lettuce'] },
  { es: 'zanahoria', en: 'carrot', tokens: ['zanahoria', 'pastanaga', 'carrot'] },
  { es: 'maíz', en: 'corn', tokens: ['maiz', 'maíz', 'blat', 'corn', 'sweet corn'] },
  { es: 'melocotón', en: 'peach', tokens: ['melocoton', 'melocotón', 'pressec', 'prèssec', 'peach'] },
  { es: 'chocolate', en: 'chocolate', tokens: ['chocolate', 'xocolata', 'choco'] },
  { es: 'yogur', en: 'yogurt', tokens: ['yogur', 'yogurt', 'iogurt'] },
  { es: 'pasta', en: 'pasta', tokens: ['pasta', 'macarrones', 'espaguetis', 'spaghetti', 'noodles'] },
  { es: 'harina', en: 'flour', tokens: ['harina', 'farina', 'flour'] },
  { es: 'mantequilla', en: 'butter', tokens: ['mantequilla', 'mantega', 'butter'] },
  { es: 'salmorejo', en: 'gazpacho', tokens: ['salmorejo', 'gazpacho'] },
  { es: 'judía', en: 'bean', tokens: ['judia', 'judía', 'mongeta', 'bean', 'beans'] },
  { es: 'garbanzo', en: 'chickpea', tokens: ['garbanzo', 'cigro', 'cigró', 'chickpea'] },
  { es: 'lenteja', en: 'lentil', tokens: ['lenteja', 'llenties', 'lentil'] },
  { es: 'manzana', en: 'apple', tokens: ['manzana', 'poma', 'apple'] },
  { es: 'plátano', en: 'banana', tokens: ['platano', 'plátano', 'platan', 'banana'] },
  { es: 'limón', en: 'lemon', tokens: ['limon', 'limón', 'llimona', 'lemon'] },
  { es: 'fresa', en: 'strawberry', tokens: ['fresa', 'maduixa', 'strawberry'] },
  { es: 'uva', en: 'grape', tokens: ['uva', 'uvas', 'raim', 'raïm', 'grape'] },
  { es: 'gambas', en: 'shrimp', tokens: ['gamba', 'gambas', 'shrimp', 'prawn'] },
  { es: 'salmón', en: 'salmon', tokens: ['salmon', 'salmón', 'salmo'] },
  { es: 'caldo', en: 'broth', tokens: ['caldo', 'brou', 'broth', 'stock'] },
  { es: 'azúcar', en: 'sugar', tokens: ['azucar', 'azúcar', 'sucre', 'sugar'] },
  { es: 'café', en: 'coffee', tokens: ['cafe', 'café', 'cafè', 'coffee'] },
  { es: 'agua', en: 'water', tokens: ['agua', 'aigua', 'water'] },
  { es: 'zumo', en: 'juice', tokens: ['zumo', 'suc', 'juice'] },
]

export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '')
}

export function normalizeKey(s: string): string {
  return stripAccents(s.toLowerCase())
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(s: string): string[] {
  return normalizeKey(s)
    .split(' ')
    .filter(w => w.length > 1 && !NOISE_WORDS.has(w))
}

/** Nombre legible en español para guardar en alacena */
export function normalizePantryName(raw: string): string {
  const cleaned = raw
    .replace(/\s+/g, ' ')
    .replace(/\*+/g, '')
    .replace(/\b\d{5,}\b/g, '')
    .trim()

  const words = cleaned.split(' ')
  const translated = words.map(word => {
    const lower = normalizeKey(word)
    return CA_TO_ES[lower] ?? word
  })

  const name = translated.join(' ')
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function groupsForText(text: string): { es: string; en: string; tokens: string[] }[] {
  const key = normalizeKey(text)
  const tokens = tokenize(text)
  const matched: { es: string; en: string; tokens: string[] }[] = []

  for (const group of INGREDIENT_GROUPS) {
    const hit = group.tokens.some(t => {
      const tk = normalizeKey(t)
      if (tk.length <= 3) return tokens.includes(tk)
      return key.includes(tk) || tokens.some(w => w.includes(tk) || tk.includes(w))
    })
    if (hit) matched.push(group)
  }

  return matched
}

/** Términos en inglés para buscar recetas en Spoonacular */
export function pantryToSearchTerms(pantryNames: string[]): string[] {
  const terms = new Set<string>()

  for (const name of pantryNames) {
    const groups = groupsForText(name)
    if (groups.length > 0) {
      for (const g of groups) terms.add(g.en)
    } else {
      const tokens = tokenize(normalizePantryName(name))
      const main = tokens.find(t => t.length > 3) ?? tokens[0]
      if (main) terms.add(main)
    }
  }

  return [...terms]
}

/** ¿Son el mismo ingrediente almacén ↔ receta? */
export function ingredientsMatch(pantryName: string, recipeName: string): boolean {
  const pantryGroups = groupsForText(pantryName)
  const recipeGroups = groupsForText(recipeName)

  if (pantryGroups.length > 0 && recipeGroups.length > 0) {
    return pantryGroups.some(pg => recipeGroups.some(rg => pg.es === rg.es))
  }

  const pKey = normalizeKey(pantryName)
  const rKey = normalizeKey(recipeName)
  if (pKey.includes(rKey) || rKey.includes(pKey)) return true

  const pTokens = tokenize(pantryName)
  const rTokens = tokenize(recipeName)
  return pTokens.some(pt =>
    rTokens.some(rt => pt.length > 3 && rt.length > 3 && (pt.includes(rt) || rt.includes(pt)))
  )
}

/** Ingrediente de receta → español para mostrar en la app */
export function toSpanishIngredient(name: string): string {
  const groups = groupsForText(name)
  if (groups.length > 0) {
    return groups[0]!.es.charAt(0).toUpperCase() + groups[0]!.es.slice(1)
  }
  return normalizePantryName(name)
}

export function findPantryMatch<T extends { name: string }>(
  pantry: T[],
  recipeIngredientName: string
): T | undefined {
  return pantry.find(p => ingredientsMatch(p.name, recipeIngredientName))
}
