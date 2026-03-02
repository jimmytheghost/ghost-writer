const WORD_PATTERN = /[A-Za-z]+(?:['-][A-Za-z]+)*/g
const TRAILING_PUNCTUATION_PATTERN = /[)\]}",.!?:;'`]+/
export const DEFAULT_CUSTOM_WORD_LIST = Object.freeze([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.md',
  '.txt',
  '.pdf',
  'zoomable',
  'customizable',
  'clickable',
  'scrollable',
  'draggable',
  'editable',
  'selectable',
  'expandable',
  'collapsible',
  'resizable',
  'focusable',
  'interactive',
  'downloadable',
  'shareable',
  'navigable',
  'dashable',
  'auto-generated',
  'auto-save',
  'auto-complete',
  'pre-defined',
  'real-time',
  'near-real-time',
  'well-known',
  'open-source',
  'open-source',
  'cross-platform',
  'user-friendly',
  'backwards-compatible',
  'forward-compatible',
  'lightweight',
  'fullscreen',
  'full-screen',
  'high-resolution',
  'low-level',
  'high-level',
  'middle-ware',
  'meta-data',
  're-render',
  're-renders',
  're-rendered',
  'hot-reload',
  'hot-reloading',
  'devstral',
  'ollama',
])

const customWords = new Set()
let spellChecker = null
let spellCheckerLoadPromise = null

function normalizeWord(value) {
  const trimmed = String(value ?? '').trim().toLowerCase()
  if (!trimmed) return ''
  return trimmed.replace(/^[^a-z]+|[^a-z]+$/g, '')
}

export function setCustomSpellcheckWords(words = []) {
  customWords.clear()

  for (const word of words) {
    const normalized = normalizeWord(word)
    if (!normalized) continue
    customWords.add(normalized)
  }

  if (spellChecker) {
    for (const word of customWords) {
      spellChecker.add(word)
    }
  }
}

async function loadSpellChecker() {
  if (spellChecker) return spellChecker
  if (spellCheckerLoadPromise) return spellCheckerLoadPromise

  spellCheckerLoadPromise = Promise.resolve()
    .then(async () => {
      const nspellModule = await import('nspell')
      const NSpell = nspellModule.default

      if (import.meta.env.MODE === 'test') {
        const [affModule, dicModule] = await Promise.all([
          import('dictionary-en-us/index.aff?raw'),
          import('dictionary-en-us/index.dic?raw'),
        ])
        spellChecker = new NSpell(affModule.default, dicModule.default)
        return spellChecker
      }

      try {
        const [affUrlModule, dicUrlModule] = await Promise.all([
          import('dictionary-en-us/index.aff?url'),
          import('dictionary-en-us/index.dic?url'),
        ])
        const [affResponse, dicResponse] = await Promise.all([
          fetch(affUrlModule.default, { cache: 'force-cache' }),
          fetch(dicUrlModule.default, { cache: 'force-cache' }),
        ])
        if (!affResponse.ok || !dicResponse.ok) {
          throw new Error('Unable to load spellcheck dictionaries.')
        }
        const [aff, dic] = await Promise.all([affResponse.text(), dicResponse.text()])
        spellChecker = new NSpell(aff, dic)
        return spellChecker
      } catch {
        const [affModule, dicModule] = await Promise.all([
          import('dictionary-en-us/index.aff?raw'),
          import('dictionary-en-us/index.dic?raw'),
        ])
        spellChecker = new NSpell(affModule.default, dicModule.default)
        return spellChecker
      }
    })
    .catch((error) => {
      spellChecker = null
      throw error
    })
    .finally(() => {
      if (!spellChecker) {
        spellCheckerLoadPromise = null
      }
    })

  return spellCheckerLoadPromise
}

export async function preloadSpellcheck() {
  try {
    await loadSpellChecker()
    return true
  } catch {
    return false
  }
}

export function isSpellcheckReady() {
  return Boolean(spellChecker)
}

function shouldSkipWord(word) {
  if (word.length <= 1) return true
  if (/^[A-Z]+$/.test(word)) return true
  return false
}

function isCommittedWord(text, endIndex) {
  if (endIndex >= text.length) return false

  let cursor = endIndex
  while (cursor < text.length) {
    const char = text[cursor]
    if (TRAILING_PUNCTUATION_PATTERN.test(char)) {
      cursor += 1
      continue
    }
    return /\s/.test(char)
  }

  return false
}

export function getMisspelledRanges(text = '') {
  if (!text || !spellChecker) return []

  const matches = text.matchAll(WORD_PATTERN)
  const ranges = []

  for (const match of matches) {
    const word = match[0] || ''
    const start = match.index ?? -1
    if (start < 0 || shouldSkipWord(word)) continue
    if (!isCommittedWord(text, start + word.length)) continue

    const normalized = word.toLowerCase()
    if (customWords.has(normalized)) continue
    if (spellChecker.correct(normalized)) continue

    ranges.push({
      start,
      end: start + word.length,
    })
  }

  return ranges
}

export function getMisspelledWordCounts(text = '') {
  if (!text || !spellChecker) return []

  const matches = text.matchAll(WORD_PATTERN)
  const counts = new Map()

  for (const match of matches) {
    const word = match[0] || ''
    if (shouldSkipWord(word)) continue

    const normalized = word.toLowerCase()
    if (customWords.has(normalized)) continue
    if (spellChecker.correct(normalized)) continue

    const current = counts.get(normalized)
    if (current) {
      current.count += 1
      continue
    }
    counts.set(normalized, { word: normalized, count: 1 })
  }

  return [...counts.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return a.word.localeCompare(b.word)
  })
}

setCustomSpellcheckWords(DEFAULT_CUSTOM_WORD_LIST)
