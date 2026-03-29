/**
 * Utilidades de normalización de texto para detección de duplicación semántica
 */

// Stop words en español (ampliable)
const SPANISH_STOP_WORDS = new Set([
  'de', 'un', 'una', 'unos', 'unas', 'el', 'la', 'los', 'las', 'y', 'o', 'pero',
  'en', 'a', 'por', 'para', 'con', 'sin', 'sobre', 'bajo', 'entre', 'hasta',
  'desde', 'durante', 'mediante', 'versus', 'via', 'caren', 'carencia', 'falta',
  'del', 'al', 'lo', 'le', 'se', 'su', 'sus', 'que', 'qué', 'como', 'cuando',
  'donde', 'cual', 'cuales', 'este', 'esta', 'estos', 'estas', 'ese', 'esa',
  'esos', 'esas', 'aquel', 'aquella', 'aquellos', 'aquellas', 'ser', 'estar',
  'tener', 'haber', 'hacer', 'poder', 'decir', 'ir', 'ver', 'dar', 'saber',
  'querer', 'llegar', 'llevar', 'dejar', 'seguir', 'encontrar', 'llamar',
  'mucho', 'muchos', 'mucha', 'muchas', 'poco', 'pocos', 'poca', 'pocas',
  'todo', 'todos', 'toda', 'todas', 'alguno', 'algunos', 'alguna', 'algunas',
  'ninguno', 'ningunos', 'ninguna', 'ningunas', 'otro', 'otros', 'otra', 'otras',
  'mismo', 'mismos', 'misma', 'mismas', 'tan', 'tanto', 'tantos', 'tanta', 'tantas'
]);

// Stemming básico para español (sufijos comunes)
function stemSpanishWord(word: string): string {
  if (word.length < 4) return word.toLowerCase();
  
  const lowerWord = word.toLowerCase();
  
  // Eliminar sufijos comunes
  const suffixes = [
    'ación', 'aciones', 'ancia', 'ancias', 'ario', 'arios', 'aria', 'arias',
    'dad', 'dades', 'dor', 'dora', 'dores', 'doros', 'ería', 'erías', 
    'ero', 'era', 'eros', 'eras', 'ible', 'ibles', 'ismo', 'ismos',
    'ista', 'istas', 'mente', 'miento', 'mientos', 'ción', 'ciones',
    'sión', 'siones', 'tud', 'tudes', 'oso', 'osa', 'osos', 'osas',
    'able', 'ables', 'ivo', 'iva', 'ivos', 'ivas'
  ];
  
  for (const suffix of suffixes) {
    if (lowerWord.endsWith(suffix)) {
      return lowerWord.slice(0, -suffix.length);
    }
  }
  
  // Reglas de stemming adicionales
  if (lowerWord.endsWith('es')) {
    return lowerWord.slice(0, -2);
  }
  
  if (lowerWord.endsWith('s')) {
    return lowerWord.slice(0, -1);
  }
  
  return lowerWord;
}

/**
 * Normaliza texto para comparación semántica:
 * 1. Convertir a minúsculas
 * 2. Eliminar puntuación y caracteres especiales
 * 3. Filtrar stop words
 * 4. Aplicar stemming
 * 5. Eliminar duplicados
 */
export function normalizeText(text: string): Set<string> {
  if (!text || typeof text !== 'string') return new Set();
  
  const words = text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .split(/[^\wáéíóúñ]+/) // Dividir por no-palabras
    .filter(word => word.length > 2 && !SPANISH_STOP_WORDS.has(word))
    .map(stemSpanishWord)
    .filter(word => word.length > 0);
  
  return new Set(words);
}

/**
 * Calcula similitud Jaccard entre dos textos normalizados
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  const set1 = normalizeText(text1);
  const set2 = normalizeText(text2);
  
  if (set1.size === 0 && set2.size === 0) return 0;
  if (set1.size === 0 || set2.size === 0) return 0;
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Extrae el texto principal de un scorecard para comparación
 */
export function extractScorecardText(scorecard: any): string {
  const texts = [
    scorecard["A. Problema"]?.content?.description || '',
    scorecard["A. Problema"]?.content?.problem || '',
    scorecard["B. Límites"]?.content?.scope || '',
    scorecard["C. Especificación Técnica"]?.content?.spec || '',
    JSON.stringify(scorecard["A. Problema"]?.content || {}),
    JSON.stringify(scorecard["B. Límites"]?.content || {}),
    scorecard.metadata?.authorDid || ''
  ];
  
  return texts.join(' ').trim();
}
