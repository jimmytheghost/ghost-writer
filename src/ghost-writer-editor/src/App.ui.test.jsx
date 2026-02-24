import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('App UI behaviors', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          models: ['devstral-small-2:24b'],
        }),
      })),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts with collapsed footer and can expand/collapse', () => {
    render(<App />)

    const expandFooter = screen.getByLabelText('Expand footer controls')
    fireEvent.click(expandFooter)

    expect(screen.getByLabelText('Collapse footer')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Collapse footer'))
    expect(screen.getByLabelText('Expand footer controls')).toBeInTheDocument()
  })

  it('creates and activates a new tab from footer New action', () => {
    render(<App />)
    fireEvent.click(screen.getByLabelText('Expand footer controls'))

    fireEvent.click(screen.getByLabelText('New document'))

    expect(screen.getByRole('tab', { name: 'Switch to Untitled 2' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Switch to Untitled' })).toBeInTheDocument()
  })

  it('exits markdown preview back to the editor from footer exit control', () => {
    render(<App />)
    fireEvent.click(screen.getByLabelText('Expand footer controls'))

    fireEvent.click(screen.getByLabelText('Toggle markdown preview'))
    expect(document.querySelector('textarea.editor__textarea')).toBeNull()

    fireEvent.click(screen.getByLabelText('Exit markdown preview'))
    expect(document.querySelector('textarea.editor__textarea')).not.toBeNull()
  })
})
