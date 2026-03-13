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
  loadDesktopOllamaModels: vi.fn(async () => ({ ok: true, models: ['devstral-small-2:24b'] })),
  markRendererInteractive: vi.fn(),
  openExternalUrl: vi.fn(async () => true),
  exitApp: vi.fn(async () => true),
  closeCurrentWindow: vi.fn(async () => true),
  listenDesktopEvent: vi.fn(async () => () => {}),
}))

const markdownMocks = vi.hoisted(() => ({
  renderMarkdownToSafeHtml: vi.fn(() => '<p>preview</p>'),
  isSafeMarkdownUrl: vi.fn(() => true),
}))

vi.mock('./hooks/useDesktopAppMetadata', () => ({
  useDesktopAppMetadata: () => {},
}))

vi.mock('./hooks/useTauriMenuEvents', () => ({
  useTauriMenuEvents: () => {},
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
  openExternalUrl: desktopRuntimeMocks.openExternalUrl,
  exitApp: desktopRuntimeMocks.exitApp,
  closeCurrentWindow: desktopRuntimeMocks.closeCurrentWindow,
  listenDesktopEvent: desktopRuntimeMocks.listenDesktopEvent,
}))

vi.mock('./lib/markdown', () => ({
  renderMarkdownToSafeHtml: markdownMocks.renderMarkdownToSafeHtml,
  isSafeMarkdownUrl: markdownMocks.isSafeMarkdownUrl,
}))

import App from './App'

describe('App preview image rendering', () => {
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

  it('passes the active markdown file path into preview rendering', async () => {
    desktopRuntimeMocks.openMarkdownWithNativeDialog.mockResolvedValue({
      path: 'C:\\Users\\jimmy\\Documents\\Notes\\chapter-one.md',
      content: '![Preview](./images/hero.png)',
    })

    render(<App />)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Load document'))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Switch to chapter-one' })).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(markdownMocks.renderMarkdownToSafeHtml).toHaveBeenCalledWith(
        '![Preview](./images/hero.png)',
        expect.objectContaining({
          baseFilePath: 'C:\\Users\\jimmy\\Documents\\Notes\\chapter-one.md',
        }),
      )
    })
  })
})
