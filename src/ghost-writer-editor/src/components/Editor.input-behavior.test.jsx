import { fireEvent, render, screen } from '@testing-library/react'
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

function InteractiveEditor({ initialValue = '' }) {
  const [value, setValue] = useState(initialValue)
  return (
    <Editor
      value={value}
      onChange={setValue}
      onPromptOpen={vi.fn()}
      onSelectionChange={vi.fn()}
      selectionRange={{ start: 0, end: 0 }}
      showSelectionOverlay={false}
      spellCheckEnabled={false}
      textZoomPercent={100}
    />
  )
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

})
