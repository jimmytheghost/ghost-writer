import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function mockNavigatorPlatform(platform) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'platform')
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    get: () => platform,
  })

  return () => {
    if (originalDescriptor) {
      Object.defineProperty(window.navigator, 'platform', originalDescriptor)
      return
    }
    delete window.navigator.platform
  }
}

describe('App keyboard shortcuts', () => {
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

  it('submits prompt with Ctrl+Enter', async () => {
    const requestSubmitSpy = vi
      .spyOn(HTMLFormElement.prototype, 'requestSubmit')
      .mockImplementation(() => {})

    render(<App />)
    const promptInput = screen.getByLabelText('Prompt input')
    const sendButton = screen.getByLabelText('Send prompt')

    fireEvent.change(promptInput, { target: { value: 'polish this paragraph' } })
    await waitFor(() => {
      expect(sendButton).not.toBeDisabled()
    })
    fireEvent.keyDown(promptInput, { key: 'Enter', ctrlKey: true })

    expect(requestSubmitSpy).toHaveBeenCalledTimes(1)
  })

  it('submits prompt with Meta+Enter', async () => {
    const requestSubmitSpy = vi
      .spyOn(HTMLFormElement.prototype, 'requestSubmit')
      .mockImplementation(() => {})

    render(<App />)
    const promptInput = screen.getByLabelText('Prompt input')
    const sendButton = screen.getByLabelText('Send prompt')

    fireEvent.change(promptInput, { target: { value: 'polish this paragraph' } })
    await waitFor(() => {
      expect(sendButton).not.toBeDisabled()
    })
    fireEvent.keyDown(promptInput, { key: 'Enter', metaKey: true })

    expect(requestSubmitSpy).toHaveBeenCalledTimes(1)
  })

  it('creates a new tab with Ctrl+N', () => {
    render(<App />)

    fireEvent.keyDown(window, { key: 'n', ctrlKey: true })

    expect(screen.getByRole('tab', { name: 'Switch to Untitled 2' })).toHaveAttribute('aria-selected', 'true')
  })

  it('creates a new tab with Meta+N', () => {
    render(<App />)

    fireEvent.keyDown(window, { key: 'n', metaKey: true })

    expect(screen.getByRole('tab', { name: 'Switch to Untitled 2' })).toHaveAttribute('aria-selected', 'true')
  })

  it('opens find and replace panel with Ctrl+F', () => {
    render(<App />)

    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })

    expect(screen.getByLabelText('Find and replace panel')).toBeInTheDocument()
    expect(screen.getByLabelText('Find previous match')).toBeInTheDocument()
    expect(screen.getByLabelText('Find')).toHaveFocus()
  })

  it('selects all editor content with Ctrl+A', () => {
    render(<App />)

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, { target: { value: 'select this whole line' } })
    fireEvent.keyDown(editor, { key: 'a', ctrlKey: true })

    expect(editor.selectionStart).toBe(0)
    expect(editor.selectionEnd).toBe('select this whole line'.length)
  })

  it('closes active tab with Ctrl+W', () => {
    render(<App />)

    fireEvent.keyDown(window, { key: 'n', ctrlKey: true })
    expect(screen.getByRole('tab', { name: 'Switch to Untitled 2' })).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(window, { key: 'w', ctrlKey: true })

    expect(screen.queryByRole('tab', { name: 'Switch to Untitled 2' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Switch to Untitled' })).toHaveAttribute('aria-selected', 'true')
  })

  it('closes all tabs with Ctrl+Shift+W and keeps one fresh tab', () => {
    render(<App />)

    fireEvent.keyDown(window, { key: 'n', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true })

    expect(screen.getByRole('tab', { name: 'Switch to Untitled 3' })).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(window, { key: 'w', ctrlKey: true, shiftKey: true })

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(1)
    expect(screen.getByRole('tab', { name: 'Switch to Untitled' })).toHaveAttribute('aria-selected', 'true')
  })

  it('switches tabs with Alt+ArrowLeft and Alt+ArrowRight on PC only when editor is focused', async () => {
    render(<App />)

    fireEvent.keyDown(window, { key: 'n', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true })
    expect(screen.getByRole('tab', { name: 'Switch to Untitled 3' })).toHaveAttribute('aria-selected', 'true')

    const promptInput = screen.getByLabelText('Prompt input')
    promptInput.focus()
    fireEvent.keyDown(promptInput, { key: 'ArrowLeft', altKey: true })
    expect(screen.getByRole('tab', { name: 'Switch to Untitled 3' })).toHaveAttribute('aria-selected', 'true')

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    editor.focus()

    fireEvent.keyDown(editor, { key: 'ArrowLeft', altKey: true })
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to Untitled 2' })).toHaveAttribute('aria-selected', 'true')
    })

    fireEvent.keyDown(editor, { key: 'ArrowRight', altKey: true })
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to Untitled 3' })).toHaveAttribute('aria-selected', 'true')
    })
  })

  it('does not switch tabs with Alt+Arrow keys when tab bar is hidden or no neighboring tab exists', async () => {
    render(<App />)

    fireEvent.keyDown(window, { key: 'n', ctrlKey: true })
    expect(screen.getByRole('tab', { name: 'Switch to Untitled 2' })).toHaveAttribute('aria-selected', 'true')

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    editor.focus()

    fireEvent.keyDown(editor, { key: 'ArrowRight', altKey: true })
    expect(screen.getByRole('tab', { name: 'Switch to Untitled 2' })).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(window, { key: 'h', ctrlKey: true, shiftKey: true })
    expect(screen.queryByRole('tablist', { name: 'Document tabs' })).not.toBeInTheDocument()

    fireEvent.keyDown(editor, { key: 'ArrowLeft', altKey: true })
    fireEvent.keyDown(window, { key: 'h', ctrlKey: true, shiftKey: true })
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to Untitled 2' })).toHaveAttribute('aria-selected', 'true')
    })
  })

  it('switches tabs with Cmd+Option+ArrowLeft and Cmd+Option+ArrowRight on macOS', async () => {
    const restorePlatform = mockNavigatorPlatform('MacIntel')

    try {
      render(<App />)

      fireEvent.keyDown(window, { key: 'n', metaKey: true })
      expect(screen.getByRole('tab', { name: 'Switch to Untitled 2' })).toHaveAttribute('aria-selected', 'true')

      const editor = document.querySelector('textarea.editor__textarea')
      expect(editor).not.toBeNull()
      editor.focus()

      fireEvent.keyDown(editor, { key: 'ArrowLeft', metaKey: true, altKey: true })
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Switch to Untitled' })).toHaveAttribute('aria-selected', 'true')
      })

      fireEvent.keyDown(editor, { key: 'ArrowRight', metaKey: true, altKey: true })
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Switch to Untitled 2' })).toHaveAttribute('aria-selected', 'true')
      })
    } finally {
      restorePlatform()
    }
  })

  it('switches tabs with Cmd+Option+ArrowLeft and Cmd+Option+ArrowRight on macOS when prompt input is focused', async () => {
    const restorePlatform = mockNavigatorPlatform('MacIntel')

    try {
      render(<App />)

      fireEvent.keyDown(window, { key: 'n', metaKey: true })
      fireEvent.keyDown(window, { key: 'n', metaKey: true })
      expect(screen.getByRole('tab', { name: 'Switch to Untitled 3' })).toHaveAttribute('aria-selected', 'true')

      const promptInput = screen.getByLabelText('Prompt input')
      promptInput.focus()

      fireEvent.keyDown(promptInput, { key: 'ArrowLeft', metaKey: true, altKey: true })
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Switch to Untitled 2' })).toHaveAttribute('aria-selected', 'true')
      })

      fireEvent.keyDown(promptInput, { key: 'ArrowRight', metaKey: true, altKey: true })
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Switch to Untitled 3' })).toHaveAttribute('aria-selected', 'true')
      })
    } finally {
      restorePlatform()
    }
  })

  it('switches tabs with Home and End on macOS (Fn+Arrow fallback)', async () => {
    const restorePlatform = mockNavigatorPlatform('MacIntel')

    try {
      render(<App />)

      fireEvent.keyDown(window, { key: 'n', metaKey: true })
      fireEvent.keyDown(window, { key: 'n', metaKey: true })
      expect(screen.getByRole('tab', { name: 'Switch to Untitled 3' })).toHaveAttribute('aria-selected', 'true')

      const promptInput = screen.getByLabelText('Prompt input')
      promptInput.focus()

      fireEvent.keyDown(promptInput, { key: 'Home' })
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Switch to Untitled 2' })).toHaveAttribute('aria-selected', 'true')
      })

      fireEvent.keyDown(promptInput, { key: 'End' })
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Switch to Untitled 3' })).toHaveAttribute('aria-selected', 'true')
      })
    } finally {
      restorePlatform()
    }
  })

  it('toggles footer collapsed/open with Ctrl+Shift+B', () => {
    render(<App />)
    expect(screen.getByLabelText('Expand footer controls')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'b', ctrlKey: true, shiftKey: true })
    expect(screen.getByLabelText('Collapse footer')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'B', ctrlKey: true, shiftKey: true })
    expect(screen.getByLabelText('Expand footer controls')).toBeInTheDocument()
  })

  it('toggles tab bar visibility with Ctrl+Shift+H', () => {
    render(<App />)
    expect(screen.getByRole('tablist', { name: 'Document tabs' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'h', ctrlKey: true, shiftKey: true })
    expect(screen.queryByRole('tablist', { name: 'Document tabs' })).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'H', ctrlKey: true, shiftKey: true })
    expect(screen.getByRole('tablist', { name: 'Document tabs' })).toBeInTheDocument()
  })

  it('duplicates the active tab with Ctrl+Shift+D', () => {
    render(<App />)

    fireEvent.keyDown(window, { key: 'd', ctrlKey: true, shiftKey: true })

    expect(screen.getByRole('tab', { name: 'Switch to Untitled copy' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('toggles prompt panel visibility with Ctrl+Shift+I and expands editor layout', () => {
    const { container } = render(<App />)
    const appMain = container.querySelector('.app__main')
    expect(appMain).not.toBeNull()
    expect(screen.getByLabelText('Prompt input')).toBeInTheDocument()
    expect(appMain).not.toHaveClass('app__main--focus-editor')

    fireEvent.keyDown(window, { key: 'i', ctrlKey: true, shiftKey: true })

    expect(screen.queryByLabelText('Prompt input')).not.toBeInTheDocument()
    expect(appMain).toHaveClass('app__main--focus-editor')

    fireEvent.keyDown(window, { key: 'I', ctrlKey: true, shiftKey: true })

    expect(screen.getByLabelText('Prompt input')).toBeInTheDocument()
    expect(appMain).not.toHaveClass('app__main--focus-editor')
  })

  it('opens print flow with Ctrl+P', () => {
    vi.useFakeTimers()
    const printMock = vi.fn()
    vi.stubGlobal('print', printMock)

    render(<App />)

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, { target: { value: '# Title\nBody {{remove me}} text' } })

    fireEvent.keyDown(window, { key: 'p', ctrlKey: true })

    const printRoot = document.getElementById('ghost-writer-print-root')
    expect(printRoot).not.toBeNull()
    expect(printRoot?.innerHTML ?? '').toContain('<h1>Title</h1>')
    expect(printRoot?.innerHTML ?? '').toContain('<p>Body {{remove me}} text</p>')
    expect(printRoot?.innerHTML ?? '').toContain('{{remove me}}')
    expect(printMock).toHaveBeenCalledTimes(1)

    act(() => {
      vi.runOnlyPendingTimers()
    })
    vi.useRealTimers()
  })

  it('copies the full editor document with Ctrl+C when no editor text is selected', async () => {
    const writeText = vi.fn(async () => {})
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(<App />)
    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, { target: { value: 'entire document content' } })
    editor.focus()
    editor.setSelectionRange(4, 4)

    fireEvent.keyDown(editor, { key: 'c', ctrlKey: true })

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('entire document content')
    })
  })

  it('copies only selected editor text with Ctrl+C', async () => {
    const writeText = vi.fn(async () => {})
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(<App />)
    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, { target: { value: 'copy this selected chunk' } })
    editor.focus()
    editor.setSelectionRange(5, 9)

    fireEvent.keyDown(editor, { key: 'c', ctrlKey: true })

    await waitFor(() => {
      expect(writeText).not.toHaveBeenCalled()
    })
  })
})
