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
  recordEditorDiagnostic: vi.fn(),
  openExternalUrl: vi.fn(async () => true),
  exitApp: vi.fn(async () => true),
  closeCurrentWindow: vi.fn(async () => true),
  listenDesktopEvent: vi.fn(async () => () => {}),
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
  recordEditorDiagnostic: desktopRuntimeMocks.recordEditorDiagnostic,
  openExternalUrl: desktopRuntimeMocks.openExternalUrl,
  exitApp: desktopRuntimeMocks.exitApp,
  closeCurrentWindow: desktopRuntimeMocks.closeCurrentWindow,
  listenDesktopEvent: desktopRuntimeMocks.listenDesktopEvent,
}))

import App from './App'

describe('App desktop tab reorder persistence', () => {
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

  it('saves and restores drag-reordered tab order', async () => {
    desktopRuntimeMocks.loadSettings
      .mockResolvedValueOnce(null)

    const { unmount } = render(<App />)

    fireEvent.click(screen.getByLabelText('New tab'))
    fireEvent.click(screen.getByLabelText('New tab'))

    const tabOne = screen.getByRole('tab', { name: 'Switch to Untitled' })
    const tabThree = screen.getByRole('tab', { name: 'Switch to Untitled 3' })

    fireEvent.mouseDown(tabThree, { button: 0, clientX: 300, clientY: 12 })
    fireEvent.mouseMove(window, { clientX: 50, clientY: 13 })
    fireEvent.mouseUp(window)

    await waitFor(() => {
      expect(desktopRuntimeMocks.saveSettings).toHaveBeenCalled()
    })

    const savedPayload = desktopRuntimeMocks.saveSettings.mock.calls.at(-1)?.[0]
    expect(savedPayload?.sessionTabs?.map((tab) => tab.title)).toEqual(['Untitled 3', 'Untitled', 'Untitled 2'])

    unmount()

    desktopRuntimeMocks.loadSettings.mockResolvedValueOnce({
      hasFile: true,
      settings: savedPayload,
    })

    render(<App />)

    await waitFor(() => {
      const tabLabels = screen.getAllByRole('tab').map((tab) => tab.textContent?.replace('×', '').trim())
      expect(tabLabels).toEqual(['Untitled 3', 'Untitled', 'Untitled 2'])
    })
  })
})
