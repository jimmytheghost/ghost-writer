import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const desktopRuntime = vi.hoisted(() => ({
  isMacDesktopRuntime: vi.fn(),
  prepareMacosEditorInput: vi.fn(() => Promise.resolve(true)),
  recordEditorDiagnostic: vi.fn(),
}))

vi.mock('../lib/desktopRuntime', () => ({
  isMacDesktopRuntime: desktopRuntime.isMacDesktopRuntime,
  prepareMacosEditorInput: desktopRuntime.prepareMacosEditorInput,
  recordEditorDiagnostic: desktopRuntime.recordEditorDiagnostic,
}))

import Editor from './Editor'

function renderEditor(overrides = {}) {
  render(
    <Editor
      value=""
      onChange={vi.fn()}
      onPromptOpen={vi.fn()}
      onSelectionChange={vi.fn()}
      selectionRange={{ start: 0, end: 0 }}
      showSelectionOverlay={false}
      spellCheckEnabled={false}
      textZoomPercent={100}
      {...overrides}
    />,
  )

  return screen.getByRole('textbox')
}

afterEach(() => {
  desktopRuntime.isMacDesktopRuntime.mockReset()
  desktopRuntime.prepareMacosEditorInput.mockClear()
  desktopRuntime.recordEditorDiagnostic.mockClear()
})

describe('Editor desktop input preparation', () => {
  it('prepares macOS editor input behavior when the textarea receives focus', () => {
    desktopRuntime.isMacDesktopRuntime.mockReturnValue(true)
    const textarea = renderEditor()

    fireEvent.focus(textarea)

    expect(desktopRuntime.prepareMacosEditorInput).toHaveBeenCalledTimes(1)
    expect(desktopRuntime.recordEditorDiagnostic).toHaveBeenCalledWith(
      'editor.focus',
      expect.objectContaining({
        selectionStart: 0,
        selectionEnd: 0,
        valueLength: 0,
      }),
    )
  })

  it('does not prepare macOS editor input behavior outside the mac desktop runtime', () => {
    desktopRuntime.isMacDesktopRuntime.mockReturnValue(false)
    const textarea = renderEditor()

    fireEvent.focus(textarea)

    expect(desktopRuntime.prepareMacosEditorInput).not.toHaveBeenCalled()
  })

  it('records diagnostics for the macOS smart-dash restore path', () => {
    desktopRuntime.isMacDesktopRuntime.mockReturnValue(true)
    const textarea = renderEditor({ value: '--' })

    fireEvent.change(textarea, {
      target: {
        value: '— ',
        selectionStart: 2,
        selectionEnd: 2,
      },
    })

    expect(desktopRuntime.recordEditorDiagnostic).toHaveBeenCalledWith(
      'editor.change',
      expect.objectContaining({
        selectionStart: 2,
        selectionEnd: 2,
        valueLength: 2,
        previousValueLength: 2,
      }),
    )
    expect(desktopRuntime.recordEditorDiagnostic).toHaveBeenCalledWith(
      'editor.dash_restore.scheduled',
      expect.objectContaining({
        nextPosition: 3,
        expectedValueLength: 3,
      }),
    )
  })
})
