const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434'

export const OLLAMA_REQUEST_TIMEOUT_MS = 15_000

export function getOllamaBaseUrl() {
  const fromEnv = import.meta.env.VITE_OLLAMA_BASE_URL
  const rawBase = typeof fromEnv === 'string' && fromEnv.trim() ? fromEnv.trim() : DEFAULT_OLLAMA_BASE_URL

  try {
    const parsed = new URL(rawBase)
    return parsed.toString().replace(/\/+$/, '')
  } catch {
    return DEFAULT_OLLAMA_BASE_URL
  }
}

export function buildOllamaUrl(path) {
  return `${getOllamaBaseUrl()}${path}`
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = OLLAMA_REQUEST_TIMEOUT_MS) {
  const timeoutController = new AbortController()
  const externalSignal = options.signal

  const relayAbort = () => {
    timeoutController.abort()
  }

  if (externalSignal) {
    if (externalSignal.aborted) {
      timeoutController.abort()
    } else {
      externalSignal.addEventListener('abort', relayAbort, { once: true })
    }
  }

  const shouldApplyTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0
  const timeoutId = shouldApplyTimeout ? setTimeout(() => timeoutController.abort(), timeoutMs) : null

  try {
    return await fetch(url, {
      ...options,
      signal: timeoutController.signal,
    })
  } finally {
    if (timeoutId != null) {
      clearTimeout(timeoutId)
    }
  }
}
