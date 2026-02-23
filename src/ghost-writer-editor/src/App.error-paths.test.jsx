import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function mockFetchForSuccessModels() {
  return vi.fn(async (input) => {
    const url = String(input ?? '')
    if (url.includes('/ollama-models.json')) {
      return {
        ok: true,
        json: async () => ({
          models: ['devstral-small-2:24b'],
        }),
      }
    }

    return {
      ok: false,
      json: async () => ({}),
      body: null,
    }
  })
}

describe('App error paths', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetchForSuccessModels())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows an error when generation request fails', async () => {
    render(<App />)

    const promptInput = screen.getByLabelText('Prompt input')
    fireEvent.change(promptInput, { target: { value: 'test prompt' } })
    fireEvent.click(screen.getByLabelText('Send prompt'))

    await waitFor(() => {
      expect(screen.getByText('Ollama request failed. Is the server running?')).toBeInTheDocument()
    })
  })

  it('shows an error when clipboard copy fails', async () => {
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('Clipboard blocked')),
      },
    })

    render(<App />)
    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Copy to clipboard'))

    await waitFor(() => {
      expect(screen.getByText('Clipboard blocked')).toBeInTheDocument()
    })
  })

  it('rejects files larger than 2MB on load', async () => {
    render(<App />)

    const input = document.querySelector('input[type="file"]')
    expect(input).not.toBeNull()

    const oversized = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.md', {
      type: 'text/markdown',
    })

    fireEvent.change(input, { target: { files: [oversized] } })

    await waitFor(() => {
      expect(screen.getByText('Selected file is too large. Please use a file smaller than 2 MB.')).toBeInTheDocument()
    })
  })
})
