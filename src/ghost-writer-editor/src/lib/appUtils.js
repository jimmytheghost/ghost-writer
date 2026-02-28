import { DEFAULT_CUSTOM_WORD_LIST } from './spellcheck'

export const MAX_LOAD_FILE_SIZE_BYTES = Number.POSITIVE_INFINITY
export const FILE_TOO_LARGE_MESSAGE = ''
export const ALWAYS_ON_TOP_STORAGE_KEY = 'ghost-writer-always-on-top'
export const TEXT_ZOOM_OPTIONS = Object.freeze(['50%', '75%', '100%', '125%', '150%'])
export const DEFAULT_SETTINGS = Object.freeze({
  defaultModel: '',
  defaultTheme: 'dark',
  defaultTextZoom: '100%',
  defaultAlwaysOnTop: false,
  defaultFooterCollapsed: true,
  defaultStartupPreview: false,
  defaultSpellCheck: false,
  customWordList: [...DEFAULT_CUSTOM_WORD_LIST],
  customWordListDisabled: [],
  autoSaveEnabled: false,
  autoSaveIntervalSeconds: 60,
  sessionSavedTabPaths: [],
  sessionActiveTabPath: '',
})

function toWordSet(values = []) {
  const set = new Set()
  for (const value of values) {
    const normalized = String(value ?? '').trim().toLowerCase()
    if (!normalized) continue
    set.add(normalized)
  }
  return set
}

export function resolveEnabledCustomWords(customWordList = [], customWordListDisabled = []) {
  const disabledSet = toWordSet(customWordListDisabled)
  const enabledWords = []

  for (const value of customWordList) {
    const word = String(value ?? '').trim()
    if (!word) continue
    if (disabledSet.has(word.toLowerCase())) continue
    enabledWords.push(word)
  }

  return enabledWords
}

export function normalizeTextZoom(value) {
  const raw = String(value ?? '').trim()
  if (!TEXT_ZOOM_OPTIONS.includes(raw)) return 100
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) return 100
  return parsed
}

export function readInitialAlwaysOnTop() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(ALWAYS_ON_TOP_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function readLegacyAlwaysOnTopSetting() {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(ALWAYS_ON_TOP_STORAGE_KEY)
    if (value == null) return null
    return value === 'true'
  } catch {
    return null
  }
}

export function ensureMarkdownFileName(name) {
  const trimmed = name.trim()
  if (!trimmed) return 'untitled.md'
  return trimmed.toLowerCase().endsWith('.md') ? trimmed : `${trimmed}.md`
}

export function fileNameFromPath(path) {
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}

export function stripExtension(name) {
  return name.replace(/\.[^./\\]+$/, '')
}

export function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function escapeRtf(value = '') {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\r?\n/g, '\\par\n')
}

export function escapeLatex(value = '') {
  return value
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([{}#$%&_])/g, '\\$1')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/~/g, '\\textasciitilde{}')
}

export function getTextByteSize(value = '') {
  const text = String(value ?? '')
  if (typeof Blob !== 'undefined') {
    return new Blob([text]).size
  }
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(text).length
  }
  return text.length
}

export function exceedsLoadFileSizeLimit(value = '') {
  return getTextByteSize(value) > MAX_LOAD_FILE_SIZE_BYTES
}
