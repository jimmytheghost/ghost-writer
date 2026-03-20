import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const desktopRuntimeMocks = vi.hoisted(() => ({
  loadSettings: vi.fn(async () => null),
  saveSettings: vi.fn(async () => null),
  setAlwaysOnTop: vi.fn(async () => true),
  saveMarkdownWithNativeDialog: vi.fn(async () => null),
  saveMarkdownToPath: vi.fn(async () => null),
  renameMarkdownFileWithNativeDialog: vi.fn(async () => null),
  saveTextFileWithNativeDialog: vi.fn(async () => null),
  openMarkdownWithNativeDialog: vi.fn(async () => null),
  loadMarkdownFilesByPaths: vi.fn(async () => []),
  loadDesktopOllamaModels: vi.fn(async () => ({ ok: true, models: ['devstral-small-2:24b'] })),
  markRendererInteractive: vi.fn(),
  recordEditorDiagnostic: vi.fn(),
  openExternalUrl: vi.fn(async () => true),
  exitApp: vi.fn(async () => true),
  closeCurrentWindow: vi.fn(async () => true),
  listenDesktopEvent: vi.fn(async () => () => {}),
}))

const tauriMenuEventMocks = vi.hoisted(() => ({
  latestHandlers: null,
}))

vi.mock('./hooks/useDesktopAppMetadata', () => ({
  useDesktopAppMetadata: () => {},
}))

vi.mock('./hooks/useTauriMenuEvents', () => ({
  useTauriMenuEvents: (handlers) => {
    tauriMenuEventMocks.latestHandlers = handlers
  },
}))

vi.mock('./lib/desktopRuntime', async () => ({
  ensureOllamaRunning: vi.fn(async () => ({ ok: true })),
  isDesktopRuntime: () => true,
  isMacDesktopRuntime: () => false,
  loadSettings: desktopRuntimeMocks.loadSettings,
  saveSettings: desktopRuntimeMocks.saveSettings,
  setAlwaysOnTop: desktopRuntimeMocks.setAlwaysOnTop,
  saveMarkdownWithNativeDialog: desktopRuntimeMocks.saveMarkdownWithNativeDialog,
  saveMarkdownToPath: desktopRuntimeMocks.saveMarkdownToPath,
  renameMarkdownFileWithNativeDialog: desktopRuntimeMocks.renameMarkdownFileWithNativeDialog,
  saveTextFileWithNativeDialog: desktopRuntimeMocks.saveTextFileWithNativeDialog,
  openMarkdownWithNativeDialog: desktopRuntimeMocks.openMarkdownWithNativeDialog,
  loadMarkdownFilesByPaths: desktopRuntimeMocks.loadMarkdownFilesByPaths,
  loadDesktopOllamaModels: desktopRuntimeMocks.loadDesktopOllamaModels,
  markRendererInteractive: desktopRuntimeMocks.markRendererInteractive,
  recordEditorDiagnostic: desktopRuntimeMocks.recordEditorDiagnostic,
  openExternalUrl: desktopRuntimeMocks.openExternalUrl,
  exitApp: desktopRuntimeMocks.exitApp,
  closeCurrentWindow: desktopRuntimeMocks.closeCurrentWindow,
  listenDesktopEvent: desktopRuntimeMocks.listenDesktopEvent,
}))

import App from './App'

describe('App desktop save flow', () => {
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
    vi.clearAllMocks()
  })

  it('saves directly to existing path after opening a native desktop file', async () => {
    desktopRuntimeMocks.openMarkdownWithNativeDialog.mockResolvedValue({
      path: '/tmp/chapter-one.md',
      content: 'Draft opening line',
    })
    desktopRuntimeMocks.saveMarkdownToPath.mockResolvedValue('/tmp/chapter-one.md')

    render(<App />)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Load document'))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to chapter-one' })).toBeInTheDocument()
    })

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, { target: { value: 'Draft opening line\nSecond line' } })

    fireEvent.keyDown(window, { key: 's', ctrlKey: true })

    await waitFor(() => {
      expect(desktopRuntimeMocks.saveMarkdownToPath).toHaveBeenCalledWith(
        'Draft opening line\nSecond line',
        '/tmp/chapter-one.md',
      )
    })
    expect(desktopRuntimeMocks.saveMarkdownWithNativeDialog).not.toHaveBeenCalled()
  })

  it('shows transient footer feedback after saving a desktop file', async () => {
    desktopRuntimeMocks.saveMarkdownWithNativeDialog.mockResolvedValue('/tmp/feedback-save.md')

    render(<App />)

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, { target: { value: 'Footer feedback save test' } })

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    const saveButton = screen.getByLabelText('Save document')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Saved')
    })
    expect(saveButton).toHaveClass('doc-actions__button--feedback')

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1700))
    })

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
    expect(saveButton).not.toHaveClass('doc-actions__button--feedback')
  })

  it('uses Save As dialog on Ctrl+Shift+S instead of duplicating tabs', async () => {
    desktopRuntimeMocks.saveMarkdownWithNativeDialog.mockResolvedValue('/tmp/untitled-saved.md')

    render(<App />)

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, { target: { value: 'Untitled draft content' } })

    fireEvent.keyDown(window, { key: 's', ctrlKey: true, shiftKey: true })

    await waitFor(() => {
      expect(desktopRuntimeMocks.saveMarkdownWithNativeDialog).toHaveBeenCalledWith(
        'Untitled draft content',
        'Untitled.md',
      )
    })

    expect(desktopRuntimeMocks.saveMarkdownToPath).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: 'Switch to untitled-saved' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('tab', { name: 'Switch to Untitled 2' })).not.toBeInTheDocument()
  })

  it('routes rename on an untitled desktop tab through the native Save As workflow', async () => {
    desktopRuntimeMocks.saveMarkdownWithNativeDialog.mockResolvedValue('/tmp/renamed-from-untitled.md')

    render(<App />)

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, { target: { value: 'Untitled draft content' } })

    await act(async () => {
      await tauriMenuEventMocks.latestHandlers.onRename()
    })

    await waitFor(() => {
      expect(desktopRuntimeMocks.saveMarkdownWithNativeDialog).toHaveBeenCalledWith(
        'Untitled draft content',
        'Untitled.md',
      )
    })

    expect(desktopRuntimeMocks.renameMarkdownFileWithNativeDialog).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: 'Switch to renamed-from-untitled' })).toHaveAttribute('aria-selected', 'true')
  })

  it('allows oversized native desktop file loads', async () => {
    desktopRuntimeMocks.openMarkdownWithNativeDialog.mockResolvedValue({
      path: '/tmp/large.md',
      content: 'a'.repeat(2 * 1024 * 1024 + 1),
    })

    render(<App />)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Load document'))

    await waitFor(() => {
      expect(screen.queryByText('Selected file is too large. Please use a file smaller than 2 MB.')).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to large' })).toBeInTheDocument()
    })
  })

  it('opens desktop-loaded files in a new tab instead of replacing current tab', async () => {
    desktopRuntimeMocks.openMarkdownWithNativeDialog.mockResolvedValue({
      path: '/tmp/chapter-two.md',
      content: 'Loaded file content',
    })

    render(<App />)

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, { target: { value: 'Keep this in original tab' } })

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Load document'))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to chapter-two' })).toHaveAttribute('aria-selected', 'true')
    })
    expect(screen.getByRole('tab', { name: /Switch to Untitled\*?/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /Switch to Untitled\*?/ }))
    expect(document.querySelector('textarea.editor__textarea')).toHaveValue('Keep this in original tab')
  })

  it('shows an already-open modal and switches to the existing tab when opening the same desktop file twice', async () => {
    desktopRuntimeMocks.openMarkdownWithNativeDialog.mockReset()
    desktopRuntimeMocks.openMarkdownWithNativeDialog
      .mockResolvedValueOnce({
        path: '/tmp/already-open.md',
        content: '# First open',
      })
      .mockResolvedValueOnce({
        path: '/tmp/already-open.md',
        content: '# First open',
      })

    render(<App />)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Load document'))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to already-open' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('New document'))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Switch to Untitled\*?/ })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })
    expect(screen.getAllByRole('tab')).toHaveLength(2)

    fireEvent.click(screen.getByLabelText('Load document'))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'This file is already open' })).toBeInTheDocument()
    })
    expect(screen.getAllByRole('tab')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Switch to tab' }))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to already-open' })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })
  })

  it('replaces active empty untitled tab when opening a desktop file', async () => {
    desktopRuntimeMocks.openMarkdownWithNativeDialog.mockReset()
    desktopRuntimeMocks.openMarkdownWithNativeDialog.mockResolvedValue({
      path: '/tmp/chapter-empty-replace.md',
      content: 'Loaded into empty tab',
    })

    render(<App />)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Load document'))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to chapter-empty-replace' })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })

    expect(screen.queryByRole('tab', { name: /Switch to Untitled\*?/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Switch to Untitled 2\*?/ })).not.toBeInTheDocument()
  })

  it('closes an unmodified saved tab without opening native save dialog', async () => {
    desktopRuntimeMocks.openMarkdownWithNativeDialog.mockResolvedValue({
      path: '/tmp/chapter-three.md',
      content: 'Already saved content',
    })

    render(<App />)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Load document'))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to chapter-three' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Close chapter-three'))

    await waitFor(() => {
      expect(screen.queryByRole('tab', { name: 'Switch to chapter-three' })).not.toBeInTheDocument()
    })
    expect(desktopRuntimeMocks.saveMarkdownWithNativeDialog).not.toHaveBeenCalled()
  })

  it('saves dirty saved tabs to their existing path after confirmation when closing', async () => {
    desktopRuntimeMocks.openMarkdownWithNativeDialog.mockResolvedValue({
      path: '/tmp/chapter-four.md',
      content: 'Original content',
    })
    desktopRuntimeMocks.saveMarkdownToPath.mockResolvedValue('/tmp/chapter-four.md')

    render(<App />)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Load document'))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to chapter-four' })).toBeInTheDocument()
    })

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, { target: { value: 'Original content\nChanged' } })

    fireEvent.click(screen.getByLabelText('Close chapter-four*'))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Save before closing?' })).toBeInTheDocument()
    })

    expect(desktopRuntimeMocks.saveMarkdownWithNativeDialog).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))

    await waitFor(() => {
      expect(desktopRuntimeMocks.saveMarkdownToPath).toHaveBeenCalledWith(
        'Original content\nChanged',
        '/tmp/chapter-four.md',
      )
    })

    expect(desktopRuntimeMocks.saveMarkdownWithNativeDialog).not.toHaveBeenCalled()
    expect(screen.queryByRole('tab', { name: 'Switch to chapter-four*' })).not.toBeInTheDocument()
  })

  it('closes a dirty tab without opening save dialog when No is selected', async () => {
    desktopRuntimeMocks.openMarkdownWithNativeDialog.mockResolvedValue({
      path: '/tmp/chapter-no-save.md',
      content: 'Original content',
    })

    render(<App />)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Load document'))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to chapter-no-save' })).toBeInTheDocument()
    })

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, { target: { value: 'Original content\nChanged' } })

    fireEvent.click(screen.getByLabelText('Close chapter-no-save*'))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Save before closing?' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'No' }))

    await waitFor(() => {
      expect(screen.queryByRole('tab', { name: 'Switch to chapter-no-save*' })).not.toBeInTheDocument()
    })

    expect(desktopRuntimeMocks.saveMarkdownWithNativeDialog).not.toHaveBeenCalled()
  })

  it('keeps a dirty tab open when the save dialog is cancelled after confirming Yes', async () => {
    desktopRuntimeMocks.openMarkdownWithNativeDialog.mockResolvedValue({
      path: '/tmp/chapter-cancel.md',
      content: 'Original content',
    })
    desktopRuntimeMocks.saveMarkdownToPath.mockResolvedValue(null)

    render(<App />)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Load document'))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to chapter-cancel' })).toBeInTheDocument()
    })

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, { target: { value: 'Original content\nChanged' } })

    fireEvent.click(screen.getByLabelText('Close chapter-cancel*'))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Save before closing?' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))

    await waitFor(() => {
      expect(desktopRuntimeMocks.saveMarkdownToPath).toHaveBeenCalledWith(
        'Original content\nChanged',
        '/tmp/chapter-cancel.md',
      )
    })

    expect(desktopRuntimeMocks.saveMarkdownWithNativeDialog).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: 'Switch to chapter-cancel*' })).toBeInTheDocument()
  })

  it('opens native save dialog for dirty untitled tabs after confirmation when closing', async () => {
    desktopRuntimeMocks.saveMarkdownWithNativeDialog.mockResolvedValue('/tmp/untitled-close-save.md')

    render(<App />)

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, { target: { value: 'Unsaved draft content' } })

    fireEvent.click(screen.getByLabelText('Close Untitled*'))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Save before closing?' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))

    await waitFor(() => {
      expect(desktopRuntimeMocks.saveMarkdownWithNativeDialog).toHaveBeenCalledWith(
        'Unsaved draft content',
        'Untitled.md',
      )
    })

    expect(desktopRuntimeMocks.saveMarkdownToPath).not.toHaveBeenCalled()
    expect(screen.queryByRole('tab', { name: 'Switch to Untitled*' })).not.toBeInTheDocument()
  })

  it('keeps a dirty tab open when the close confirmation is cancelled with Escape', async () => {
    desktopRuntimeMocks.openMarkdownWithNativeDialog.mockResolvedValue({
      path: '/tmp/chapter-escape-cancel.md',
      content: 'Original content',
    })

    render(<App />)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Load document'))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to chapter-escape-cancel' })).toBeInTheDocument()
    })

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, { target: { value: 'Original content\nChanged' } })

    fireEvent.click(screen.getByLabelText('Close chapter-escape-cancel*'))

    const dialog = await screen.findByRole('dialog', { name: 'Save before closing?' })
    expect(dialog).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Save before closing?' })).not.toBeInTheDocument()
    })

    expect(desktopRuntimeMocks.saveMarkdownToPath).not.toHaveBeenCalled()
    expect(desktopRuntimeMocks.saveMarkdownWithNativeDialog).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: 'Switch to chapter-escape-cancel*' })).toBeInTheDocument()
  })

  it('keeps a dirty tab open when the close confirmation is cancelled by clicking the backdrop', async () => {
    desktopRuntimeMocks.openMarkdownWithNativeDialog.mockResolvedValue({
      path: '/tmp/chapter-backdrop-cancel.md',
      content: 'Original content',
    })

    render(<App />)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Load document'))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to chapter-backdrop-cancel' })).toBeInTheDocument()
    })

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, { target: { value: 'Original content\nChanged' } })

    fireEvent.click(screen.getByLabelText('Close chapter-backdrop-cancel*'))

    const dialog = await screen.findByRole('dialog', { name: 'Save before closing?' })
    const overlay = dialog.parentElement
    expect(overlay).not.toBeNull()

    fireEvent.click(overlay)

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Save before closing?' })).not.toBeInTheDocument()
    })

    expect(desktopRuntimeMocks.saveMarkdownToPath).not.toHaveBeenCalled()
    expect(desktopRuntimeMocks.saveMarkdownWithNativeDialog).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: 'Switch to chapter-backdrop-cancel*' })).toBeInTheDocument()
  })

  it('keeps a dirty tab open when the close confirmation is cancelled with the close button', async () => {
    desktopRuntimeMocks.openMarkdownWithNativeDialog.mockResolvedValue({
      path: '/tmp/chapter-close-button-cancel.md',
      content: 'Original content',
    })

    render(<App />)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Load document'))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to chapter-close-button-cancel' })).toBeInTheDocument()
    })

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, { target: { value: 'Original content\nChanged' } })

    fireEvent.click(screen.getByLabelText('Close chapter-close-button-cancel*'))

    await screen.findByRole('dialog', { name: 'Save before closing?' })

    fireEvent.click(screen.getByRole('button', { name: 'Cancel close confirmation' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Save before closing?' })).not.toBeInTheDocument()
    })

    expect(desktopRuntimeMocks.saveMarkdownToPath).not.toHaveBeenCalled()
    expect(desktopRuntimeMocks.saveMarkdownWithNativeDialog).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: 'Switch to chapter-close-button-cancel*' })).toBeInTheDocument()
  })

  it('persists theme changes from footer toggle', async () => {
    render(<App />)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Switch to light mode'))

    await waitFor(() => {
      expect(screen.getByLabelText('Switch to dark mode')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(desktopRuntimeMocks.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ defaultTheme: 'light' }),
      )
    })
  })

  it('shows an error in the model control instead of cached models when Ollama is unavailable', async () => {
    desktopRuntimeMocks.loadDesktopOllamaModels.mockResolvedValueOnce({
      ok: false,
      error: 'Could not connect to Ollama.',
    })

    render(<App />)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))

    await waitFor(() => {
      expect(screen.getByText('Model load failed: Could not connect to Ollama.')).toBeInTheDocument()
    })

    const modelSelect = screen.getByLabelText('Ollama model')
    expect(modelSelect).toHaveValue('')
    expect(modelSelect).toHaveTextContent('No models available')
    expect(modelSelect).not.toHaveTextContent('devstral-small-2:24b')
  })

  it('auto-saves dirty saved tabs to their existing path when enabled', async () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval').mockImplementation((callback) => {
      queueMicrotask(() => {
        callback()
      })
      return 1
    })
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval').mockImplementation(() => {})

    desktopRuntimeMocks.loadSettings.mockResolvedValueOnce({
      hasFile: true,
      settings: {
        defaultModel: '',
        defaultTheme: 'dark',
        defaultTextZoom: '100%',
        defaultAlwaysOnTop: false,
        defaultFooterCollapsed: true,
        defaultStartupPreview: false,
        defaultSpellCheck: false,
        defaultShowMdPrompts: true,
        autoSaveEnabled: true,
        autoSaveIntervalSeconds: 5,
        ollamaBaseUrl: 'http://127.0.0.1:11434',
        customWordList: [],
        customWordListDisabled: [],
        sessionTabs: [],
        sessionActiveTabId: '',
        sessionNextUntitledIndex: 2,
        sessionSavedTabPaths: [],
        sessionActiveTabPath: '',
      },
    })
    desktopRuntimeMocks.openMarkdownWithNativeDialog.mockResolvedValue({
      path: '/tmp/chapter-five.md',
      content: 'Saved baseline',
    })
    desktopRuntimeMocks.saveMarkdownToPath.mockResolvedValue('/tmp/chapter-five.md')

    render(<App />)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Load document'))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to chapter-five' })).toBeInTheDocument()
    })

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, { target: { value: 'Saved baseline\nAutosaved update' } })

    await waitFor(() => {
      expect(desktopRuntimeMocks.saveMarkdownToPath).toHaveBeenCalledWith(
        'Saved baseline\nAutosaved update',
        '/tmp/chapter-five.md',
      )
    })

    setIntervalSpy.mockRestore()
    clearIntervalSpy.mockRestore()
  })

  it('does not reload desktop settings when switching between open tabs', async () => {
    desktopRuntimeMocks.loadSettings.mockResolvedValueOnce({
      hasFile: true,
      settings: {
        defaultModel: '',
        defaultTheme: 'dark',
        defaultTextZoom: '100%',
        defaultAlwaysOnTop: false,
        defaultFooterCollapsed: true,
        defaultStartupPreview: false,
        defaultSpellCheck: false,
        defaultShowMdPrompts: true,
        autoSaveEnabled: false,
        autoSaveIntervalSeconds: 60,
        ollamaBaseUrl: 'http://127.0.0.1:11434',
        customWordList: [],
        customWordListDisabled: [],
        sessionTabs: [],
        sessionActiveTabId: '',
        sessionNextUntitledIndex: 2,
        sessionSavedTabPaths: [],
        sessionActiveTabPath: '',
      },
    })
    desktopRuntimeMocks.openMarkdownWithNativeDialog
      .mockResolvedValueOnce({
        path: '/tmp/chapter-six.md',
        content: 'First file',
      })
      .mockResolvedValueOnce({
        path: '/tmp/chapter-seven.md',
        content: 'Second file',
      })

    render(<App />)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Load document'))
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to chapter-six' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Load document'))
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to chapter-seven' })).toBeInTheDocument()
    })

    expect(desktopRuntimeMocks.loadSettings).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('tab', { name: 'Switch to chapter-six' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Switch to chapter-seven' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Switch to chapter-six' }))

    await waitFor(() => {
      expect(desktopRuntimeMocks.loadSettings).toHaveBeenCalledTimes(1)
    })
  })

  it('reuses the lowest untitled number after restoring a desktop session', async () => {
    desktopRuntimeMocks.loadSettings.mockResolvedValueOnce({
      hasFile: true,
      settings: {
        defaultModel: '',
        defaultTheme: 'dark',
        defaultTextZoom: '100%',
        defaultAlwaysOnTop: false,
        defaultFooterCollapsed: true,
        defaultStartupPreview: false,
        defaultSpellCheck: false,
        defaultShowMdPrompts: true,
        autoSaveEnabled: false,
        autoSaveIntervalSeconds: 60,
        ollamaBaseUrl: 'http://127.0.0.1:11434',
        customWordList: [],
        customWordListDisabled: [],
        sessionTabs: [
          {
            id: 'tab-existing',
            title: 'Untitled',
            content: '',
            filePath: '',
            lastSavedContent: '',
            isDirty: false,
            isPreviewOpen: false,
          },
        ],
        sessionActiveTabId: 'tab-existing',
        sessionNextUntitledIndex: 23,
        sessionSavedTabPaths: [],
        sessionActiveTabPath: '',
      },
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to Untitled' })).toHaveAttribute('aria-selected', 'true')
    })

    fireEvent.click(screen.getByLabelText('New tab'))

    expect(screen.getByRole('tab', { name: 'Switch to Untitled 2' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('tab', { name: 'Switch to Untitled 23' })).not.toBeInTheDocument()
  })

  it('restores editor scroll position independently for loaded file tabs', async () => {
    desktopRuntimeMocks.openMarkdownWithNativeDialog
      .mockResolvedValueOnce({
        path: '/tmp/chapter-scroll-one.md',
        content: Array.from({ length: 300 }, (_, index) => `First file line ${index + 1}`).join('\n'),
      })
      .mockResolvedValueOnce({
        path: '/tmp/chapter-scroll-two.md',
        content: Array.from({ length: 300 }, (_, index) => `Second file line ${index + 1}`).join('\n'),
      })

    render(<App />)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Load document'))
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to chapter-scroll-one' })).toBeInTheDocument()
    })

    let editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    editor.scrollTop = 240
    fireEvent.scroll(editor)

    const expandFooterButton = screen.queryByLabelText('Expand footer controls')
    if (expandFooterButton) {
      fireEvent.click(expandFooterButton)
    }
    fireEvent.click(screen.getByLabelText('Load document'))
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to chapter-scroll-two' })).toBeInTheDocument()
    })

    editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    await waitFor(() => {
      expect(editor.scrollTop).toBe(0)
    })

    editor.scrollTop = 90
    fireEvent.scroll(editor)

    fireEvent.click(screen.getByRole('tab', { name: 'Switch to chapter-scroll-one' }))
    editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    await waitFor(() => {
      expect(editor.scrollTop).toBe(240)
    })

    fireEvent.click(screen.getByRole('tab', { name: 'Switch to chapter-scroll-two' }))
    editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    await waitFor(() => {
      expect(editor.scrollTop).toBe(90)
    })
  })
})
