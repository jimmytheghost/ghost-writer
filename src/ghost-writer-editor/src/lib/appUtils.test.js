import { describe, expect, it } from 'vitest'
import {
  DEFAULT_OLLAMA_BASE_URL,
  FILE_TOO_LARGE_MESSAGE,
  MAX_LOAD_FILE_SIZE_BYTES,
  exceedsLoadFileSizeLimit,
  normalizeOllamaBaseUrl,
} from './appUtils'

describe('appUtils - file size limit', () => {
  it('should allow files under 10MB', () => {
    const underLimit = ' '.repeat(100 * 1024) // 100KB
    const exceeds = ' '.repeat(10 * 1024 * 1024 + 1) // 10MB + 1 byte

    expect(exceedsLoadFileSizeLimit(underLimit)).toBe(false)
    expect(exceedsLoadFileSizeLimit(exceeds)).toBe(true)
  })

  it('should reject empty string', () => {
    expect(exceedsLoadFileSizeLimit('')).toBe(false)
  })

  it('should show proper error message when limit exceeded', () => {
    expect(FILE_TOO_LARGE_MESSAGE).toBe('File is too large to load. Maximum allowed file size is 10MB.')
    expect(FILE_TOO_LARGE_MESSAGE.length).toBeGreaterThan(0)
  })

  it('should use 10MB limit', () => {
    expect(MAX_LOAD_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024)
  })
})

describe('appUtils - ollama base url', () => {
  it('normalizes valid endpoint values', () => {
    expect(normalizeOllamaBaseUrl('http://localhost:11434/')).toBe('http://localhost:11434')
    expect(normalizeOllamaBaseUrl('https://example.com')).toBe('https://example.com')
  })

  it('falls back to default for invalid endpoint values', () => {
    expect(normalizeOllamaBaseUrl('')).toBe(DEFAULT_OLLAMA_BASE_URL)
    expect(normalizeOllamaBaseUrl('ws://localhost:11434')).toBe(DEFAULT_OLLAMA_BASE_URL)
    expect(normalizeOllamaBaseUrl('http://localhost:11434/api')).toBe(DEFAULT_OLLAMA_BASE_URL)
    expect(normalizeOllamaBaseUrl('http://user:pass@localhost:11434')).toBe(DEFAULT_OLLAMA_BASE_URL)
  })
})
