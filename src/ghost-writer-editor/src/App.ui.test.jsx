import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  it('creates and activates a new tab from footer New action', () => {
    render(<App />)
    fireEvent.click(screen.getByLabelText('Expand footer controls'))

    fireEvent.click(screen.getByLabelText('New document'))

    expect(screen.getByRole('tab', { name: 'Switch to Untitled 2' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Switch to Untitled' })).toBeInTheDocument()
  })

  it('exits markdown preview back to the editor with Escape', () => {
    render(<App />)
    fireEvent.click(screen.getByLabelText('Expand footer controls'))

    fireEvent.click(screen.getByLabelText('Toggle markdown preview'))
    expect(document.querySelector('textarea.editor__textarea')).toBeNull()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(document.querySelector('textarea.editor__textarea')).not.toBeNull()
  })

  it('shows unresolved inline prompt tokens in markdown preview by default', () => {
    render(<App />)

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, { target: { value: 'Before {{hidden inline prompt}} after' } })

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Toggle markdown preview'))

    const previewContent = document.querySelector('.preview__content')
    expect(previewContent?.textContent ?? '').toContain('Before')
    expect(previewContent?.textContent ?? '').toContain('after')
    expect(previewContent?.textContent ?? '').toContain('hidden inline prompt')
    expect(previewContent?.textContent ?? '').toContain('{{hidden inline prompt}}')
  })

  it('keeps preview task toggles as stable custom buttons across scroll', async () => {
    render(<App />)

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, {
      target: {
        value: ['# Checklist', '', '- [ ] Use a clean workspace', '- [x] Prefer a manual smoke test'].join('\n'),
      },
    })

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Toggle markdown preview'))

    const previewContent = document.querySelector('.preview__content')
    expect(previewContent).not.toBeNull()

    let previewButtons = previewContent.querySelectorAll('[data-preview-checkbox="true"]')
    expect(previewButtons).toHaveLength(2)
    expect(previewButtons[0].tagName).toBe('BUTTON')
    expect(previewButtons[0]).toHaveAttribute('aria-pressed', 'false')
    expect(previewButtons[1]).toHaveAttribute('aria-pressed', 'true')

    previewContent.scrollTop = 32
    fireEvent.scroll(previewContent)

    await waitFor(() => {
      expect(previewContent.scrollTop).toBe(32)
    })

    previewButtons = previewContent.querySelectorAll('[data-preview-checkbox="true"]')
    expect(previewButtons).toHaveLength(2)
    expect(previewButtons[0].tagName).toBe('BUTTON')
    expect(previewButtons[0]).toHaveAttribute('aria-pressed', 'false')
    expect(previewButtons[1]).toHaveAttribute('aria-pressed', 'true')
  })

  it('toggles markdown task items when clicking preview task buttons', async () => {
    render(<App />)

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, {
      target: {
        value: ['# Checklist', '', '- [ ] Use a clean workspace', '- [x] Prefer a manual smoke test'].join('\n'),
      },
    })

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Toggle markdown preview'))

    const previewContent = document.querySelector('.preview__content')
    expect(previewContent).not.toBeNull()

    await waitFor(() => {
      const previewButtons = previewContent.querySelectorAll('[data-preview-checkbox="true"]')
      expect(previewButtons).toHaveLength(2)
      expect(previewButtons[0]).toHaveAttribute('data-source-line', '2')
    })

    const previewButtons = previewContent.querySelectorAll('[data-preview-checkbox="true"]')
    fireEvent.click(previewButtons[0])

    fireEvent.click(screen.getByLabelText('Exit markdown preview'))

    await waitFor(() => {
      expect(document.querySelector('textarea.editor__textarea')).toHaveValue(
        ['# Checklist', '', '- [x] Use a clean workspace', '- [x] Prefer a manual smoke test'].join('\n'),
      )
    })
  })

  it('toggles numbered markdown task items when clicking preview task buttons', async () => {
    render(<App />)

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, {
      target: {
        value: ['# Ordered checklist', '', '1. [ ] Use a clean workspace', '2. [x] Prefer a manual smoke test'].join(
          '\n',
        ),
      },
    })

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Toggle markdown preview'))

    const previewContent = document.querySelector('.preview__content')
    expect(previewContent).not.toBeNull()

    await waitFor(() => {
      const previewButtons = previewContent.querySelectorAll('[data-preview-checkbox="true"]')
      expect(previewButtons).toHaveLength(2)
      expect(previewButtons[0]).toHaveAttribute('data-source-line', '2')
    })

    const previewButtons = previewContent.querySelectorAll('[data-preview-checkbox="true"]')
    fireEvent.click(previewButtons[0])

    fireEvent.click(screen.getByLabelText('Exit markdown preview'))

    await waitFor(() => {
      expect(document.querySelector('textarea.editor__textarea')).toHaveValue(
        ['# Ordered checklist', '', '1. [x] Use a clean workspace', '2. [x] Prefer a manual smoke test'].join('\n'),
      )
    })
  })

  it('toggles preview task buttons even when the checkbox node is replaced after render', async () => {
    render(<App />)

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, {
      target: {
        value: ['# Checklist', '', '- [ ] Use a clean workspace', '- [ ] Prefer a manual smoke test'].join('\n'),
      },
    })

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Toggle markdown preview'))

    const previewContent = document.querySelector('.preview__content')
    expect(previewContent).not.toBeNull()

    await waitFor(() => {
      const previewButtons = previewContent.querySelectorAll('[data-preview-checkbox="true"]')
      expect(previewButtons).toHaveLength(2)
      expect(previewButtons[0]).toHaveAttribute('data-source-line', '2')
    })

    const originalButton = previewContent.querySelectorAll('[data-preview-checkbox="true"]')[0]
    const replacementButton = originalButton.cloneNode(true)
    originalButton.replaceWith(replacementButton)

    fireEvent.click(replacementButton)
    fireEvent.click(screen.getByLabelText('Exit markdown preview'))

    await waitFor(() => {
      expect(document.querySelector('textarea.editor__textarea')).toHaveValue(
        ['# Checklist', '', '- [x] Use a clean workspace', '- [ ] Prefer a manual smoke test'].join('\n'),
      )
    })
  })

  it('find and replace updates editor content', () => {
    render(<App />)

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, { target: { value: 'alpha beta alpha' } })

    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })

    const findInput = screen.getByLabelText('Find')
    const replaceInput = screen.getByLabelText('Replace')
    fireEvent.change(findInput, { target: { value: 'alpha' } })
    fireEvent.change(replaceInput, { target: { value: 'omega' } })

    fireEvent.click(screen.getByLabelText('Replace all matches'))

    expect(document.querySelector('textarea.editor__textarea')).toHaveValue('omega beta omega')
    expect(screen.getByRole('status')).toHaveTextContent('Replaced 2 matches.')
  })

  it('find and replace supports multi-word phrases', () => {
    render(<App />)

    const editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, {
      target: { value: 'And I definitely didn’t playing API fees for drafting personal essays.' },
    })

    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })

    const findInput = screen.getByLabelText('Find')
    const replaceInput = screen.getByLabelText('Replace')
    fireEvent.change(findInput, { target: { value: 'playing API' } })
    fireEvent.change(replaceInput, { target: { value: 'paying API' } })

    fireEvent.click(screen.getByLabelText('Replace all matches'))

    expect(document.querySelector('textarea.editor__textarea')).toHaveValue(
      'And I definitely didn’t paying API fees for drafting personal essays.',
    )
    expect(screen.getByRole('status')).toHaveTextContent('Replaced 1 match.')
  })

  it('maintains independent editor scroll position per tab', async () => {
    render(<App />)

    let editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    editor.scrollTop = 180
    fireEvent.scroll(editor)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('New document'))

    editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    await waitFor(() => {
      expect(editor.scrollTop).toBe(0)
    })

    editor.scrollTop = 45
    fireEvent.scroll(editor)

    fireEvent.click(screen.getByRole('tab', { name: 'Switch to Untitled' }))

    editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    await waitFor(() => {
      expect(editor.scrollTop).toBe(180)
    })
  })

  it('syncs scroll position between editor and markdown preview for active tab', async () => {
    render(<App />)

    let editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    editor.scrollTop = 220
    fireEvent.scroll(editor)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Toggle markdown preview'))

    const previewContent = document.querySelector('.preview__content')
    expect(previewContent).not.toBeNull()
    await waitFor(() => {
      expect(previewContent.scrollTop).toBe(220)
    })

    previewContent.scrollTop = 75
    fireEvent.scroll(previewContent)

    fireEvent.click(screen.getByLabelText('Exit markdown preview'))

    editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    await waitFor(() => {
      expect(editor.scrollTop).toBe(75)
    })
  })
})
