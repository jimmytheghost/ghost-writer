import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  markRendererInteractive: vi.fn(),
  openExternalUrl: vi.fn(async () => true),
}))

vi.mock('./hooks/useDesktopAppMetadata', () => ({
  useDesktopAppMetadata: () => {},
}))

vi.mock('./hooks/useTauriMenuEvents', () => ({
  useTauriMenuEvents: () => {},
}))

vi.mock('./lib/desktopRuntime', async () => ({
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
  markRendererInteractive: desktopRuntimeMocks.markRendererInteractive,
  openExternalUrl: desktopRuntimeMocks.openExternalUrl,
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

  it('rejects oversized native desktop file loads', async () => {
    desktopRuntimeMocks.openMarkdownWithNativeDialog.mockResolvedValue({
      path: '/tmp/large.md',
      content: 'a'.repeat(2 * 1024 * 1024 + 1),
    })

    render(<App />)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Load document'))

    await waitFor(() => {
      expect(screen.getByText('Selected file is too large. Please use a file smaller than 2 MB.')).toBeInTheDocument()
    })
  })
})
