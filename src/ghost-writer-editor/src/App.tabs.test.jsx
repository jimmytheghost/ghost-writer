import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function setupModelFetchMock() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        models: ['devstral-small-2:24b'],
      }),
    })),
  )
}

describe('App tabs', () => {
  beforeEach(() => {
    setupModelFetchMock()
    URL.createObjectURL = vi.fn(() => 'blob:ghost-writer-test')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('starts with a single Untitled tab active', () => {
    render(<App />)

    expect(screen.getByRole('tab', { name: 'Switch to Untitled' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('tab', { name: 'Switch to Untitled 2' })).not.toBeInTheDocument()
  })

  it('creates monotonic untitled tabs from + button', () => {
    render(<App />)

    fireEvent.click(screen.getByLabelText('New tab'))
    fireEvent.click(screen.getByLabelText('New tab'))

    expect(screen.getByRole('tab', { name: 'Switch to Untitled 3' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Switch to Untitled 2' })).toBeInTheDocument()
  })

  it('renames active tab when saving', () => {
    render(<App />)
    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Save document'))

    expect(screen.getByRole('tab', { name: 'Switch to Untitled.md' })).toHaveAttribute('aria-selected', 'true')
  })

  it('closing the only tab creates a new untitled tab', () => {
    render(<App />)

    fireEvent.click(screen.getByLabelText('Close Untitled'))

    expect(screen.getByRole('tab', { name: 'Switch to Untitled 2' })).toHaveAttribute('aria-selected', 'true')
  })

  it('closing active tab selects nearest remaining tab', () => {
    render(<App />)

    fireEvent.click(screen.getByLabelText('New tab'))
    fireEvent.click(screen.getByLabelText('New tab'))

    expect(screen.getByRole('tab', { name: 'Switch to Untitled 3' })).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(screen.getByLabelText('Close Untitled 3'))

    expect(screen.getByRole('tab', { name: 'Switch to Untitled 2' })).toHaveAttribute('aria-selected', 'true')
  })
})
