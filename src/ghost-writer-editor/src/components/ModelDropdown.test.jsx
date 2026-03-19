import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ModelDropdown from './ModelDropdown'

describe('ModelDropdown', () => {
  it('renders a minimal option list with a dedicated checkmark column', () => {
    const { container } = render(
      <ModelDropdown
        id="model-dropdown"
        ariaLabel="Ollama model"
        value="llama3.1:8b"
        options={['qwen3-coder:30b', 'llama3.1:8b', 'llama3.2-vision:latest']}
        onChange={() => {}}
        placement="top"
        align="end"
      />,
    )

    fireEvent.click(screen.getByLabelText('Ollama model'))

    expect(screen.getByRole('listbox', { name: 'Ollama model' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'llama3.1:8b' })).toBeInTheDocument()
    expect(container.querySelector('.model-dropdown__option')).toHaveClass('model-dropdown__option')
    expect(container.querySelector('.model-dropdown__check')).toHaveClass('model-dropdown__check')
    expect(container.querySelector('.model-dropdown__chevron')).toBeInstanceOf(SVGElement)
  })

  it('selects an option and closes the menu', () => {
    const onChange = vi.fn()

    render(
      <ModelDropdown
        id="settings-model"
        ariaLabel="Default model"
        value=""
        options={['qwen3-coder:30b', 'llama3.1:8b']}
        includeEmptyOption
        emptyOptionLabel="Use current model"
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByLabelText('Default model'))
    fireEvent.click(screen.getByRole('option', { name: 'llama3.1:8b' }))

    expect(onChange).toHaveBeenCalledWith('llama3.1:8b')
    expect(screen.queryByRole('listbox', { name: 'Default model' })).not.toBeInTheDocument()
  })
})
