import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('App keyboard shortcuts', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          models: [{ name: 'devstral-small-2:24b' }],
        }),
      })),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('toggles markdown preview with Ctrl+Shift+M', async () => {
    render(<App />)
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
    fireEvent.click(screen.getByLabelText('Expand footer'))
    const previewButton = screen.getByLabelText('Toggle markdown preview')

    expect(previewButton).toHaveAttribute('aria-pressed', 'false')

    fireEvent.keyDown(window, { key: 'm', ctrlKey: true, shiftKey: true })
    expect(previewButton).toHaveAttribute('aria-pressed', 'true')

    fireEvent.keyDown(window, { key: 'M', ctrlKey: true, shiftKey: true })
    expect(previewButton).toHaveAttribute('aria-pressed', 'false')
  })
})
