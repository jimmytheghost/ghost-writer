import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useGlobalShortcuts } from './useGlobalShortcuts'

function createRefActionMock() {
  return { current: vi.fn() }
}

function ShortcutHarness({
  onIncreaseTextZoom = vi.fn(),
  onDecreaseTextZoom = vi.fn(),
}) {
  useGlobalShortcuts({
    saveActionRef: createRefActionMock(),
    saveAsActionRef: createRefActionMock(),
    openActionRef: createRefActionMock(),
    newActionRef: createRefActionMock(),
    closeActionRef: createRefActionMock(),
    closeAllActionRef: createRefActionMock(),
    printActionRef: createRefActionMock(),
    onToggleAlwaysOnTop: vi.fn(),
    onDuplicate: vi.fn(),
    onTogglePreview: vi.fn(),
    onToggleFooter: vi.fn(),
    onToggleTabBar: vi.fn(),
    onTogglePromptPanel: vi.fn(),
    onShowFindReplace: vi.fn(),
    onIncreaseTextZoom,
    onDecreaseTextZoom,
  })

  return null
}

describe('useGlobalShortcuts', () => {
  it('handles Ctrl/Cmd + (+/-) for editor text zoom', () => {
    const onIncreaseTextZoom = vi.fn()
    const onDecreaseTextZoom = vi.fn()
    render(
      <ShortcutHarness
        onIncreaseTextZoom={onIncreaseTextZoom}
        onDecreaseTextZoom={onDecreaseTextZoom}
      />,
    )

    fireEvent.keyDown(window, { key: '=', shiftKey: true, ctrlKey: true })
    fireEvent.keyDown(window, { key: '=', ctrlKey: true })
    fireEvent.keyDown(window, { key: '-', ctrlKey: true })
    fireEvent.keyDown(window, { key: '=', shiftKey: true, metaKey: true })
    fireEvent.keyDown(window, { key: '=', metaKey: true })
    fireEvent.keyDown(window, { key: '-', metaKey: true })

    expect(onIncreaseTextZoom).toHaveBeenCalledTimes(4)
    expect(onDecreaseTextZoom).toHaveBeenCalledTimes(2)
  })
})
