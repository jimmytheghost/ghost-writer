import { describe, expect, it, vi } from 'vitest'
import { fetchWithTimeout } from './ollama'

describe('fetchWithTimeout', () => {
  it('keeps relaying external aborts after fetch resolves', async () => {
    let capturedSignal = null

    const fetchMock = vi.fn(async (_url, options = {}) => {
      capturedSignal = options.signal
      return { ok: true }
    })

    vi.stubGlobal('fetch', fetchMock)

    const externalController = new AbortController()
    await fetchWithTimeout('http://example.test', { signal: externalController.signal }, 10_000)

    expect(capturedSignal).not.toBeNull()
    expect(capturedSignal.aborted).toBe(false)

    externalController.abort()
    expect(capturedSignal.aborted).toBe(true)

    vi.unstubAllGlobals()
  })
})
