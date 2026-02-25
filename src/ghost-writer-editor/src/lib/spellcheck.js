import NSpell from 'nspell'
import aff from 'dictionary-en-us/index.aff?raw'
import dic from 'dictionary-en-us/index.dic?raw'

const spellChecker = new NSpell(aff, dic)
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
])

const customWords = new Set()

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
  if (!text) return []

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

setCustomSpellcheckWords(DEFAULT_CUSTOM_WORD_LIST)
