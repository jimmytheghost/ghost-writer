import { act, createEvent, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import Editor from './Editor'

function renderEditor(overrides = {}) {
  const onChange = vi.fn()
  const onSelectionChange = vi.fn()
  render(
    <Editor
      value=""
      onChange={onChange}
      onPromptOpen={vi.fn()}
      onSelectionChange={onSelectionChange}
      selectionRange={{ start: 0, end: 0 }}
      showSelectionOverlay={false}
      spellCheckEnabled={false}
      textZoomPercent={100}
      {...overrides}
    />,
  )
  const textarea = screen.getByRole('textbox')
  return { textarea, onChange, onSelectionChange }
}

function InteractiveEditor({ initialValue = '', onSelectionChange = vi.fn() }) {
  const [value, setValue] = useState(initialValue)
  return (
    <Editor
      value={value}
      onChange={setValue}
      onPromptOpen={vi.fn()}
      onSelectionChange={onSelectionChange}
      selectionRange={{ start: 0, end: 0 }}
      showSelectionOverlay={false}
      spellCheckEnabled={false}
      textZoomPercent={100}
    />
  )
}

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

function dispatchTextareaInput(textarea, { value, selectionStart, selectionEnd = selectionStart, data, inputType }) {
  const event = createEvent.input(textarea, {
    bubbles: true,
    target: {
      value,
      selectionStart,
      selectionEnd,
    },
  })

  Object.defineProperty(event, 'data', {
    configurable: true,
    value: data,
  })
  Object.defineProperty(event, 'inputType', {
    configurable: true,
    value: inputType,
  })

  fireEvent(textarea, event)
}

describe('Editor input behavior', () => {
  it('preserves double hyphen typing without auto-converting to triple hyphen', () => {
    const { textarea, onChange } = renderEditor()
    fireEvent.change(textarea, { target: { value: 'A -- test ' } })
    expect(onChange).toHaveBeenCalledWith('A -- test ')
  })

  it('preserves em and en dash characters exactly as entered', () => {
    const { textarea, onChange } = renderEditor()
    fireEvent.change(textarea, { target: { value: 'A — B – C' } })
    expect(onChange).toHaveBeenCalledWith('A — B – C')
  })

  it('restores double-hyphen when smart replacement emits em dash', () => {
    const { textarea, onChange } = renderEditor({ value: 'A -- test' })
    fireEvent.change(textarea, {
      target: { value: 'A — test ', selectionStart: 9, selectionEnd: 9 },
    })
    expect(onChange).toHaveBeenCalledWith('A -- test ')
  })

  it('restores triple-hyphen when smart replacement emits em dash', () => {
    const { textarea, onChange } = renderEditor({ value: 'A --- test' })
    fireEvent.change(textarea, {
      target: { value: 'A — test ', selectionStart: 9, selectionEnd: 9 },
    })
    expect(onChange).toHaveBeenCalledWith('A --- test ')
  })

  it('does not let a stale smart-dash caret restore jump the cursor backward on macOS', () => {
    const restorePlatform = mockNavigatorPlatform('MacIntel')
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame
    const originalCancelAnimationFrame = globalThis.cancelAnimationFrame
    const queuedFrames = new Map()
    let nextFrameId = 1

    globalThis.requestAnimationFrame = vi.fn((callback) => {
      const frameId = nextFrameId
      nextFrameId += 1
      queuedFrames.set(frameId, callback)
      return frameId
    })
    globalThis.cancelAnimationFrame = vi.fn((frameId) => {
      queuedFrames.delete(frameId)
    })

    try {
      render(<InteractiveEditor initialValue="--" />)
      const textarea = screen.getByRole('textbox')

      textarea.focus()
      fireEvent.change(textarea, {
        target: { value: '— ', selectionStart: 2, selectionEnd: 2 },
      })
      expect(textarea).toHaveValue('-- ')

      fireEvent.change(textarea, {
        target: { value: '-- example', selectionStart: 10, selectionEnd: 10 },
      })
      textarea.setSelectionRange(10, 10)

      act(() => {
        for (const callback of queuedFrames.values()) {
          callback(0)
        }
      })

      expect(textarea).toHaveValue('-- example')
      expect(textarea.selectionStart).toBe(10)
      expect(textarea.selectionEnd).toBe(10)
    } finally {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame
      globalThis.cancelAnimationFrame = originalCancelAnimationFrame
      restorePlatform()
    }
  })

  it('does not swallow the macOS space-triggered smart-dash replacement event', () => {
    const restorePlatform = mockNavigatorPlatform('MacIntel')

    try {
      render(<InteractiveEditor initialValue="--" />)
      const textarea = screen.getByRole('textbox')

      textarea.focus()

      const replacementEvent = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: '—',
        inputType: 'insertReplacementText',
      })

      fireEvent(textarea, replacementEvent)

      expect(replacementEvent.defaultPrevented).toBe(false)

      fireEvent.change(textarea, {
        target: { value: '— ', selectionStart: 2, selectionEnd: 2 },
      })

      expect(textarea).toHaveValue('-- ')
      expect(textarea.selectionStart).toBe(3)
      expect(textarea.selectionEnd).toBe(3)
    } finally {
      restorePlatform()
    }
  })

  it('preserves the typed space when macOS smart-dash replacement emits only an em dash input event', () => {
    const restorePlatform = mockNavigatorPlatform('MacIntel')

    try {
      render(<InteractiveEditor initialValue="--" />)
      const textarea = screen.getByRole('textbox')

      textarea.focus()

      dispatchTextareaInput(textarea, {
        value: '—',
        selectionStart: 1,
        data: '—',
        inputType: 'insertReplacementText',
      })

      expect(textarea).toHaveValue('-- ')
      expect(textarea.selectionStart).toBe(3)
      expect(textarea.selectionEnd).toBe(3)
    } finally {
      restorePlatform()
    }
  })

  it('keeps the caret at the end through the full macOS -- example space sequence', () => {
    const restorePlatform = mockNavigatorPlatform('MacIntel')
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame
    const originalCancelAnimationFrame = globalThis.cancelAnimationFrame
    const queuedFrames = new Map()
    let nextFrameId = 1

    globalThis.requestAnimationFrame = vi.fn((callback) => {
      const frameId = nextFrameId
      nextFrameId += 1
      queuedFrames.set(frameId, callback)
      return frameId
    })
    globalThis.cancelAnimationFrame = vi.fn((frameId) => {
      queuedFrames.delete(frameId)
    })

    try {
      render(<InteractiveEditor initialValue="--" />)
      const textarea = screen.getByRole('textbox')

      textarea.focus()

      dispatchTextareaInput(textarea, {
        value: '—',
        selectionStart: 1,
        data: '—',
        inputType: 'insertReplacementText',
      })
      expect(textarea).toHaveValue('-- ')

      dispatchTextareaInput(textarea, {
        value: '-- example',
        selectionStart: 10,
        data: 'example',
        inputType: 'insertText',
      })
      dispatchTextareaInput(textarea, {
        value: '-- example ',
        selectionStart: 11,
        data: ' ',
        inputType: 'insertText',
      })

      act(() => {
        for (const callback of queuedFrames.values()) {
          callback(0)
        }
      })

      expect(textarea).toHaveValue('-- example ')
      expect(textarea.selectionStart).toBe(11)
      expect(textarea.selectionEnd).toBe(11)
    } finally {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame
      globalThis.cancelAnimationFrame = originalCancelAnimationFrame
      restorePlatform()
    }
  })

  it('restores the caret to the post-space position from the real macOS replacement sequence', () => {
    const restorePlatform = mockNavigatorPlatform('MacIntel')
    const onSelectionChange = vi.fn()
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame
    const originalCancelAnimationFrame = globalThis.cancelAnimationFrame
    const queuedFrames = new Map()
    let nextFrameId = 1

    try {
      globalThis.requestAnimationFrame = vi.fn((callback) => {
        const frameId = nextFrameId
        nextFrameId += 1
        queuedFrames.set(frameId, callback)
        return frameId
      })
      globalThis.cancelAnimationFrame = vi.fn((frameId) => {
        queuedFrames.delete(frameId)
      })

      render(
        <InteractiveEditor
          initialValue={`# Ghost Writer Manual Install Smoke Test\n\n## Active Work\n\n### Release Blockers\n\n--`}
          onSelectionChange={onSelectionChange}
        />,
      )
      const textarea = screen.getByRole('textbox')

      textarea.focus()

      dispatchTextareaInput(textarea, {
        value: `${textarea.value} `,
        selectionStart: textarea.value.length + 1,
        data: ' ',
        inputType: 'insertText',
      })

      const expectedValue = textarea.value
      const expectedCaret = textarea.selectionStart
      const replacementValue = expectedValue.replace(/-- $/, '— ')

      dispatchTextareaInput(textarea, {
        value: replacementValue,
        selectionStart: expectedCaret - 2,
        data: '—',
        inputType: 'insertReplacementText',
      })

      act(() => {
        for (const callback of queuedFrames.values()) {
          callback(0)
        }
      })

      expect(textarea).toHaveValue(expectedValue)
      expect(textarea.selectionStart).toBe(expectedCaret)
      expect(textarea.selectionEnd).toBe(expectedCaret)
      expect(onSelectionChange).toHaveBeenLastCalledWith({
        selectionStart: expectedCaret,
        selectionEnd: expectedCaret,
      })
    } finally {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame
      globalThis.cancelAnimationFrame = originalCancelAnimationFrame
      restorePlatform()
    }
  })

  it('toggles bold markers with Ctrl+B instead of stacking markers', () => {
    render(<InteractiveEditor initialValue="example" />)
    const textarea = screen.getByRole('textbox')

    textarea.focus()
    textarea.setSelectionRange(0, 'example'.length)
    fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true })
    expect(textarea).toHaveValue('**example**')

    textarea.setSelectionRange(2, 2 + 'example'.length)
    fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true })
    expect(textarea).toHaveValue('example')
  })

  it('toggles italic markers with Ctrl+I instead of stacking markers', () => {
    render(<InteractiveEditor initialValue="example" />)
    const textarea = screen.getByRole('textbox')

    textarea.focus()
    textarea.setSelectionRange(0, 'example'.length)
    fireEvent.keyDown(textarea, { key: 'i', ctrlKey: true })
    expect(textarea).toHaveValue('*example*')

    textarea.setSelectionRange(1, 1 + 'example'.length)
    fireEvent.keyDown(textarea, { key: 'i', ctrlKey: true })
    expect(textarea).toHaveValue('example')
  })

  it('supports Meta+B as the modifier shortcut on macOS', () => {
    const restorePlatform = mockNavigatorPlatform('MacIntel')
    try {
      render(<InteractiveEditor initialValue="example" />)
      const textarea = screen.getByRole('textbox')

      textarea.focus()
      textarea.setSelectionRange(0, 'example'.length)
      fireEvent.keyDown(textarea, { key: 'b', metaKey: true })
      expect(textarea).toHaveValue('**example**')
    } finally {
      restorePlatform()
    }
  })

  it('does not treat Ctrl+B as the modifier shortcut on macOS', () => {
    const restorePlatform = mockNavigatorPlatform('MacIntel')
    try {
      render(<InteractiveEditor initialValue="example" />)
      const textarea = screen.getByRole('textbox')

      textarea.focus()
      textarea.setSelectionRange(0, 'example'.length)
      fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true })
      expect(textarea).toHaveValue('example')
    } finally {
      restorePlatform()
    }
  })

  it('disables syntax, inline prompt, selection text, and streaming text overlays on Windows to avoid caret drift', () => {
    const restorePlatform = mockNavigatorPlatform('Win32')
    try {
      render(
        <Editor
          value="test {{prompt}}"
          onChange={vi.fn()}
          onPromptOpen={vi.fn()}
          onSelectionChange={vi.fn()}
          selectionRange={{ start: 0, end: 4 }}
          showSelectionOverlay={true}
          spellCheckEnabled={false}
          streamingRange={{ start: 5, end: 12, isActive: true, isFading: false }}
          textZoomPercent={100}
        />,
      )

      const textarea = screen.getByRole('textbox')

      expect(textarea.className).not.toContain('editor__textarea--syntax')
      expect(document.querySelector('.editor__syntax-overlay')).toBeNull()
      expect(document.querySelector('.editor__inline-prompt-overlay')).toBeNull()
      expect(document.querySelector('.editor__selection-overlay')).toBeNull()
      expect(document.querySelector('.editor__streaming-overlay')).toBeNull()
    } finally {
      restorePlatform()
    }
  })

  it('wraps selection with single asterisks via Ctrl+Shift+8 shortcut', () => {
    render(<InteractiveEditor initialValue="example" />)
    const textarea = screen.getByRole('textbox')

    textarea.focus()
    textarea.setSelectionRange(0, 'example'.length)
    fireEvent.keyDown(textarea, { key: '*', code: 'Digit8', ctrlKey: true, shiftKey: true })

    expect(textarea).toHaveValue('*example*')
  })

  it('wraps selection with single asterisks via Ctrl+NumpadMultiply shortcut', () => {
    render(<InteractiveEditor initialValue="example" />)
    const textarea = screen.getByRole('textbox')

    textarea.focus()
    textarea.setSelectionRange(0, 'example'.length)
    fireEvent.keyDown(textarea, { key: '*', code: 'NumpadMultiply', ctrlKey: true })

    expect(textarea).toHaveValue('*example*')
  })

  it('indents a newly continued unordered list item when pressing Tab', () => {
    render(<InteractiveEditor initialValue="- parent" />)
    const textarea = screen.getByRole('textbox')

    textarea.focus()
    textarea.setSelectionRange('- parent'.length, '- parent'.length)
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(textarea).toHaveValue('- parent\n- ')

    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    fireEvent.keyDown(textarea, { key: 'Tab' })
    expect(textarea).toHaveValue('- parent\n  - ')
  })

  it('continues an indented unordered list item on Enter and un-indents on Backspace', () => {
    render(<InteractiveEditor initialValue="  - child" />)
    const textarea = screen.getByRole('textbox')

    textarea.focus()
    textarea.setSelectionRange('  - child'.length, '  - child'.length)
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(textarea).toHaveValue('  - child\n  - ')

    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    fireEvent.keyDown(textarea, { key: 'Backspace' })
    expect(textarea).toHaveValue('  - child\n- ')
  })

  it('converts ordered list continuation to indented bullet when pressing Tab', () => {
    render(<InteractiveEditor initialValue="1. first" />)
    const textarea = screen.getByRole('textbox')

    textarea.focus()
    textarea.setSelectionRange('1. first'.length, '1. first'.length)
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(textarea).toHaveValue('1. first\n2. ')

    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    fireEvent.keyDown(textarea, { key: 'Tab' })
    expect(textarea).toHaveValue('1. first\n  - ')
  })

})
