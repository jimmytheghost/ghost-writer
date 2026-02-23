import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('App UI behaviors', () => {
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
  })

  it('starts with collapsed footer and can expand/collapse', () => {
    render(<App />)

    const expandFooter = screen.getByLabelText('Expand footer controls')
    fireEvent.click(expandFooter)

    expect(screen.getByLabelText('Collapse footer')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Collapse footer'))
    expect(screen.getByLabelText('Expand footer controls')).toBeInTheDocument()
  })

  it('shows new-document confirmation when content exists', () => {
    render(<App />)
    fireEvent.click(screen.getByLabelText('Expand footer controls'))

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, { target: { value: 'Unsaved draft content' } })
    fireEvent.click(screen.getByLabelText('New document'))

    expect(screen.getByText('Start a new document?')).toBeInTheDocument()
  })
})
