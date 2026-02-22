import { invoke } from '@tauri-apps/api/core'

const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434'
const OLLAMA_BASE_URL_FALLBACKS = ['http://127.0.0.1:11434', DEFAULT_OLLAMA_BASE_URL]
let activeOllamaBaseUrl = ''

export const OLLAMA_REQUEST_TIMEOUT_MS = 15_000

function normalizeBaseUrl(rawBase) {
  try {
    const parsed = new URL(rawBase)
    return parsed.toString().replace(/\/+$/, '')
  } catch {
    return DEFAULT_OLLAMA_BASE_URL
  }
}

export function getConfiguredOllamaBaseUrl() {
  const fromEnv = import.meta.env.VITE_OLLAMA_BASE_URL
  const rawBase = typeof fromEnv === 'string' && fromEnv.trim() ? fromEnv.trim() : DEFAULT_OLLAMA_BASE_URL
  return normalizeBaseUrl(rawBase)
}

export function getOllamaBaseUrls() {
  const configured = getConfiguredOllamaBaseUrl()
  const candidates = [configured, ...OLLAMA_BASE_URL_FALLBACKS.map(normalizeBaseUrl)]
  return [...new Set(candidates)]
}

export function setActiveOllamaBaseUrl(baseUrl) {
  activeOllamaBaseUrl = normalizeBaseUrl(baseUrl)
}

export function getOllamaBaseUrl() {
  return activeOllamaBaseUrl || getConfiguredOllamaBaseUrl()
}

export function buildOllamaUrl(path, baseUrl = getOllamaBaseUrl()) {
  return `${baseUrl}${path}`
}

export async function listOllamaModelsViaTauri() {
  if (typeof window === 'undefined') {
    return { models: null, error: 'No browser window available.' }
  }

  try {
    const models = await invoke('list_ollama_models_native')
    return {
      models: Array.isArray(models) ? models.filter(Boolean) : [],
      error: null,
    }
  } catch (error) {
    return {
      models: null,
      error: error?.message ?? 'Tauri native model lookup failed.',
    }
  }
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

  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: timeoutController.signal,
    })
  } finally {
    clearTimeout(timeoutId)
    externalSignal?.removeEventListener('abort', relayAbort)
  }
}

export async function fetchJsonWithHardTimeout(url, timeoutMs = OLLAMA_REQUEST_TIMEOUT_MS) {
  return Promise.race([
    fetch(url).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}.`)
      }
      return response.json()
    }),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`HTTP lookup timed out for ${url}.`)), timeoutMs)
    }),
  ])
}
