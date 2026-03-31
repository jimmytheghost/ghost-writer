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

    expect(screen.getByRole('tab', { name: 'Switch to Untitled' })).toHaveAttribute('aria-selected', 'true')
  })

  it('marks tab as dirty when content changes and clears it after save', () => {
    render(<App />)

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, { target: { value: 'Unsaved changes' } })

    expect(screen.getByRole('tab', { name: 'Switch to Untitled*' })).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Save document'))

    expect(screen.getByRole('tab', { name: 'Switch to Untitled' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Switch to Untitled*' })).not.toBeInTheDocument()
  })

  it('closing the only tab creates a new untitled tab', () => {
    render(<App />)

    fireEvent.click(screen.getByLabelText('Close Untitled'))

    expect(screen.getByRole('tab', { name: 'Switch to Untitled' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('tab', { name: 'Switch to Untitled 2' })).not.toBeInTheDocument()
  })

  it('closing active tab selects nearest remaining tab', () => {
    render(<App />)

    fireEvent.click(screen.getByLabelText('New tab'))
    fireEvent.click(screen.getByLabelText('New tab'))

    expect(screen.getByRole('tab', { name: 'Switch to Untitled 3' })).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(screen.getByLabelText('Close Untitled 3'))

    expect(screen.getByRole('tab', { name: 'Switch to Untitled 2' })).toHaveAttribute('aria-selected', 'true')
  })

  it('reuses the lowest missing untitled number when opening a new tab', () => {
    render(<App />)

    fireEvent.click(screen.getByLabelText('New tab'))
    fireEvent.click(screen.getByLabelText('New tab'))

    fireEvent.click(screen.getByLabelText('Close Untitled 2'))
    fireEvent.click(screen.getByLabelText('New tab'))

    expect(screen.getByRole('tab', { name: 'Switch to Untitled 2' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('tab', { name: 'Switch to Untitled 4' })).not.toBeInTheDocument()
  })

  it('restores markdown preview state per tab when switching between tabs', () => {
    render(<App />)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Toggle markdown preview'))
    expect(screen.getByLabelText('Exit markdown preview')).toHaveAttribute('aria-pressed', 'true')
    expect(document.querySelector('textarea.editor__textarea')).toBeNull()

    fireEvent.click(screen.getByLabelText('New tab'))
    expect(screen.getByLabelText('Toggle markdown preview')).toHaveAttribute('aria-pressed', 'false')
    expect(document.querySelector('textarea.editor__textarea')).not.toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: 'Switch to Untitled' }))
    expect(screen.getByLabelText('Exit markdown preview')).toHaveAttribute('aria-pressed', 'true')
    expect(document.querySelector('textarea.editor__textarea')).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: 'Switch to Untitled 2' }))
    expect(screen.getByLabelText('Toggle markdown preview')).toHaveAttribute('aria-pressed', 'false')
    expect(document.querySelector('textarea.editor__textarea')).not.toBeNull()
  })

  it('reorders tabs live when dragging over another tab', () => {
    render(<App />)

    fireEvent.click(screen.getByLabelText('New tab'))
    fireEvent.click(screen.getByLabelText('New tab'))

    const tabThree = screen.getByRole('tab', { name: 'Switch to Untitled 3' })

    fireEvent.mouseDown(tabThree, { button: 0, clientX: 300, clientY: 12 })
    fireEvent.mouseMove(window, { clientX: 50, clientY: 13 })
    fireEvent.mouseUp(window)

    const tabLabels = screen.getAllByRole('tab').map((tab) => tab.textContent?.replace('×', '').trim())
    expect(tabLabels).toEqual(['Untitled 3', 'Untitled', 'Untitled 2'])
  })

  it('ignores vertical-dominant drag movement for tab reorder', () => {
    render(<App />)

    fireEvent.click(screen.getByLabelText('New tab'))
    fireEvent.click(screen.getByLabelText('New tab'))

    const tabThree = screen.getByRole('tab', { name: 'Switch to Untitled 3' })

    fireEvent.mouseDown(tabThree, { button: 0, clientX: 300, clientY: 12 })
    fireEvent.mouseMove(window, { clientX: 295, clientY: 48 })
    fireEvent.mouseUp(window)

    const tabLabels = screen.getAllByRole('tab').map((tab) => tab.textContent?.replace('×', '').trim())
    expect(tabLabels).toEqual(['Untitled', 'Untitled 2', 'Untitled 3'])
  })

  it('moves multiple tab slots during one long horizontal drag', () => {
    render(<App />)

    fireEvent.click(screen.getByLabelText('New tab'))
    fireEvent.click(screen.getByLabelText('New tab'))
    fireEvent.click(screen.getByLabelText('New tab'))

    const tabFour = screen.getByRole('tab', { name: 'Switch to Untitled 4' })

    fireEvent.mouseDown(tabFour, { button: 0, clientX: 480, clientY: 12 })
    fireEvent.mouseMove(window, { clientX: 60, clientY: 12 })
    fireEvent.mouseUp(window)

    const tabLabels = screen.getAllByRole('tab').map((tab) => tab.textContent?.replace('×', '').trim())
    expect(tabLabels).toEqual(['Untitled 4', 'Untitled', 'Untitled 2', 'Untitled 3'])
  })

  it('uses active tab title as window title when any tab label is truncated', () => {
    render(<App />)

    fireEvent.click(screen.getByLabelText('New tab'))

    const labels = [...document.querySelectorAll('.tab-bar__label')]
    expect(labels.length).toBeGreaterThan(0)

    labels.forEach((label, index) => {
      Object.defineProperty(label, 'clientWidth', {
        configurable: true,
        get: () => 100,
      })
      Object.defineProperty(label, 'scrollWidth', {
        configurable: true,
        get: () => (index === 0 ? 200 : 100),
      })
    })

    fireEvent(window, new Event('resize'))
    expect(document.title).toBe('Untitled 2')

    labels.forEach((label) => {
      Object.defineProperty(label, 'scrollWidth', {
        configurable: true,
        get: () => 100,
      })
    })
    fireEvent(window, new Event('resize'))
    expect(document.title).toBe('Ghost Writer')
  })
})
