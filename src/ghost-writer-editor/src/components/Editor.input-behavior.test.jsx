import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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

  it('inserts literal space via keydown without relying on native substitution', () => {
    const { textarea, onChange } = renderEditor({ value: '-- example' })
    Object.defineProperty(textarea, 'selectionStart', { configurable: true, value: 10 })
    Object.defineProperty(textarea, 'selectionEnd', { configurable: true, value: 10 })
    fireEvent.keyDown(textarea, { key: ' ' })
    expect(onChange).toHaveBeenCalledWith('-- example ')
  })

})
