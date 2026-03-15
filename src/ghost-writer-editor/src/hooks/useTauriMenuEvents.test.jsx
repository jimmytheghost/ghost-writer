import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useTauriMenuEvents } from './useTauriMenuEvents'

const listenMock = vi.fn()

vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args) => listenMock(...args),
}))

vi.mock('../lib/desktopRuntime', () => ({
  isDesktopRuntime: () => true,
}))

function TestHarness({
  onDuplicate = vi.fn(),
  onTogglePromptPanel,
  onToggleColoredOutput,
}) {
  useTauriMenuEvents({
    onNew: vi.fn(),
    onOpen: vi.fn(),
    onClose: vi.fn(),
    onCloseAll: vi.fn(),
    onDuplicate,
    onRename: vi.fn(),
    onOpenRecent: vi.fn(),
    onOpenRecentError: vi.fn(),
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    onPrint: vi.fn(),
    onShowPreview: vi.fn(),
    onShowTextEdit: vi.fn(),
    onToggleAlwaysOnTop: vi.fn(),
    onToggleFooter: vi.fn(),
    onToggleTabBar: vi.fn(),
    onTogglePromptPanel,
    onToggleColoredOutput,
    onShowSettings: vi.fn(),
    onShowWordList: vi.fn(),
    onShowTextZoom: vi.fn(),
    onShowAutoSave: vi.fn(),
    onShowSpellCheck: vi.fn(),
    onExportCopyHtml: vi.fn(),
    onExportCopyRichText: vi.fn(),
    onExportHtml: vi.fn(),
    onExportPdf: vi.fn(),
    onExportRtf: vi.fn(),
    onExportWord: vi.fn(),
    onExportLatex: vi.fn(),
    onShowAbout: vi.fn(),
    onShowFindReplace: vi.fn(),
  })

  return null
}

describe('useTauriMenuEvents', () => {
  it('registers and routes the View -> Toggle Input Bar menu event', async () => {
    listenMock.mockReset()
    listenMock.mockImplementation(async () => vi.fn())

    const onTogglePromptPanel = vi.fn()
    render(
      <TestHarness
        onTogglePromptPanel={onTogglePromptPanel}
        onToggleColoredOutput={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(listenMock).toHaveBeenCalled()
    })

    const registration = listenMock.mock.calls.find(
      ([eventName]) => eventName === 'ghost-writer://menu-toggle-prompt-panel',
    )
    expect(registration).toBeDefined()

    const handler = registration?.[1]
    expect(typeof handler).toBe('function')

    handler()
    expect(onTogglePromptPanel).toHaveBeenCalledTimes(1)
  })

  it('registers and routes the View -> Toggle Colored Output menu event', async () => {
    listenMock.mockReset()
    listenMock.mockImplementation(async () => vi.fn())

    const onToggleColoredOutput = vi.fn()
    render(
      <TestHarness
        onTogglePromptPanel={vi.fn()}
        onToggleColoredOutput={onToggleColoredOutput}
      />,
    )

    await waitFor(() => {
      expect(listenMock).toHaveBeenCalled()
    })

    const registration = listenMock.mock.calls.find(
      ([eventName]) => eventName === 'ghost-writer://menu-toggle-colored-output',
    )
    expect(registration).toBeDefined()

    const handler = registration?.[1]
    expect(typeof handler).toBe('function')

    handler()
    expect(onToggleColoredOutput).toHaveBeenCalledTimes(1)
  })

  it('keeps one duplicate listener across rerenders and calls the latest handler', async () => {
    listenMock.mockReset()
    listenMock.mockImplementation(async () => vi.fn())

    const firstOnDuplicate = vi.fn()
    const secondOnDuplicate = vi.fn()

    const { rerender } = render(
      <TestHarness
        onDuplicate={firstOnDuplicate}
        onTogglePromptPanel={vi.fn()}
        onToggleColoredOutput={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(listenMock).toHaveBeenCalled()
    })

    const initialCallCount = listenMock.mock.calls.length
    const duplicateRegistration = listenMock.mock.calls.find(
      ([eventName]) => eventName === 'ghost-writer://menu-duplicate',
    )
    const duplicateHandler = duplicateRegistration?.[1]

    rerender(
      <TestHarness
        onDuplicate={secondOnDuplicate}
        onTogglePromptPanel={vi.fn()}
        onToggleColoredOutput={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(listenMock.mock.calls.length).toBe(initialCallCount)
    })

    expect(typeof duplicateHandler).toBe('function')

    duplicateHandler()

    expect(firstOnDuplicate).not.toHaveBeenCalled()
    expect(secondOnDuplicate).toHaveBeenCalledTimes(1)
  })
})
