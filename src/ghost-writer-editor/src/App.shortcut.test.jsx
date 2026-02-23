import { fireEvent, render, screen } from '@testing-library/react'
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

  it('toggles markdown preview with Ctrl+M', async () => {
    render(<App />)
    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    const previewButton = screen.getByLabelText('Toggle markdown preview')

    expect(previewButton).toHaveAttribute('aria-pressed', 'false')

    fireEvent.keyDown(window, { key: 'm', ctrlKey: true })
    expect(previewButton).toHaveAttribute('aria-pressed', 'true')

    fireEvent.keyDown(window, { key: 'M', ctrlKey: true })
    expect(previewButton).toHaveAttribute('aria-pressed', 'false')
  })

  it('toggles always-on-top with Ctrl+T', async () => {
    render(<App />)
    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    const pinButton = screen.getByLabelText('Toggle always on top')

    expect(pinButton).toHaveAttribute('aria-pressed', 'false')

    fireEvent.keyDown(window, { key: 't', ctrlKey: true })
    expect(pinButton).toHaveAttribute('aria-pressed', 'true')

    fireEvent.keyDown(window, { key: 'T', ctrlKey: true })
    expect(pinButton).toHaveAttribute('aria-pressed', 'false')
  })
})
