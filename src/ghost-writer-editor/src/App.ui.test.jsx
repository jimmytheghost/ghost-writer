import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function mockNavigatorPlatform(platform) {
  const navigatorObject = window.navigator
  const originalDescriptor =
    Object.getOwnPropertyDescriptor(navigatorObject, 'platform') ??
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(navigatorObject), 'platform')

  Object.defineProperty(navigatorObject, 'platform', {
    configurable: true,
    value: platform,
  })

  return () => {
    if (originalDescriptor) {
      Object.defineProperty(navigatorObject, 'platform', originalDescriptor)
      return
    }

    delete navigatorObject.platform
  }
}

const stubNavigatorPlatform = mockNavigatorPlatform

const scrollMetricsByElement = new Map()
const defaultScrollMetricsBySelector = new Map()

function setScrollMetrics(element, { scrollHeight, clientHeight }) {
  scrollMetricsByElement.set(element, { scrollHeight, clientHeight })
}

function setDefaultScrollMetrics(selector, { scrollHeight, clientHeight }) {
  defaultScrollMetricsBySelector.set(selector, { scrollHeight, clientHeight })
}

function getScrollMetrics(element) {
  const explicitMetrics = scrollMetricsByElement.get(element)
  if (explicitMetrics) return explicitMetrics

  for (const [selector, metrics] of defaultScrollMetricsBySelector.entries()) {
    if (element.matches?.(selector)) return metrics
  }

  return null
}

describe('App UI behaviors', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        return getScrollMetrics(this)?.scrollHeight ?? 0
      },
    })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get() {
        return getScrollMetrics(this)?.clientHeight ?? 0
      },
    })
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
    scrollMetricsByElement.clear()
    defaultScrollMetricsBySelector.clear()
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

  it('shows transient footer feedback after copying text', async () => {
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })

    render(<App />)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    const copyButton = screen.getByLabelText('Copy to clipboard')
    expect(copyButton).toHaveAttribute('title', expect.stringMatching(/^Copy \((Ctrl|Cmd)\+C\)$/))
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Copied')
    })
    expect(copyButton).toHaveClass('doc-actions__button--feedback')

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1700))
    })

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
    expect(copyButton).not.toHaveClass('doc-actions__button--feedback')
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

    let previewContent = document.querySelector('.preview__content')
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

    let previewContent = document.querySelector('.preview__content')
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

    let previewContent = document.querySelector('.preview__content')
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

  it('toggles markdown task items from preview on Windows platforms', async () => {
    const restorePlatform = stubNavigatorPlatform('Win32')

    try {
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
        const previewControls = previewContent.querySelectorAll('[data-preview-checkbox-control="true"]')
        expect(previewControls).toHaveLength(2)
        expect(previewControls[0].tagName).toBe('BUTTON')
        expect(previewControls[0]).toHaveAttribute('data-source-line', '2')
        expect(previewControls[0]).toHaveAttribute('aria-pressed', 'false')
      })

      previewContent.scrollTop = 32
      fireEvent.scroll(previewContent)

      await waitFor(() => {
        const scrolledPreviewControls = previewContent.querySelectorAll('[data-preview-checkbox-control="true"]')
        expect(scrolledPreviewControls).toHaveLength(2)
      })

      const previewControls = previewContent.querySelectorAll('[data-preview-checkbox-control="true"]')
      fireEvent.click(previewControls[0])

      await waitFor(() => {
        const refreshedPreviewControls = previewContent.querySelectorAll('[data-preview-checkbox-control="true"]')
        expect(refreshedPreviewControls[0]).toHaveAttribute('aria-pressed', 'true')
      })

      fireEvent.click(screen.getByLabelText('Exit markdown preview'))

      await waitFor(() => {
        expect(document.querySelector('textarea.editor__textarea')).toHaveValue(
          ['# Checklist', '', '- [x] Use a clean workspace', '- [x] Prefer a manual smoke test'].join('\n'),
        )
      })
    } finally {
      restorePlatform()
    }
  })

  it('syncs Windows preview checkbox DOM state back into markdown when leaving preview', async () => {
    const restorePlatform = stubNavigatorPlatform('Win32')

    try {
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
        const previewButtons = previewContent.querySelectorAll('[data-preview-checkbox-control="true"]')
        expect(previewButtons).toHaveLength(2)
      })

      const previewButtons = previewContent.querySelectorAll('[data-preview-checkbox-control="true"]')
      previewButtons[0].setAttribute('aria-pressed', 'true')

      fireEvent.click(screen.getByLabelText('Exit markdown preview'))

      await waitFor(() => {
        expect(document.querySelector('textarea.editor__textarea')).toHaveValue(
          ['# Checklist', '', '- [x] Use a clean workspace', '- [ ] Prefer a manual smoke test'].join('\n'),
        )
      })
    } finally {
      restorePlatform()
    }
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

    let previewContent = document.querySelector('.preview__content')
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

    let previewContent = document.querySelector('.preview__content')
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

  it('undoes and redoes find and replace changes from the editor shortcuts', () => {
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

    fireEvent.keyDown(editor, { key: 'z', ctrlKey: true })
    expect(document.querySelector('textarea.editor__textarea')).toHaveValue('alpha beta alpha')

    fireEvent.keyDown(editor, { key: 'y', ctrlKey: true })
    expect(document.querySelector('textarea.editor__textarea')).toHaveValue('omega beta omega')
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
    setDefaultScrollMetrics('textarea.editor__textarea', {
      scrollHeight: 1200,
      clientHeight: 200,
    })
    setDefaultScrollMetrics('.preview__content', {
      scrollHeight: 1800,
      clientHeight: 300,
    })

    render(<App />)

    let editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    setScrollMetrics(editor, {
      scrollHeight: 1200,
      clientHeight: 200,
    })
    editor.scrollTop = 220
    fireEvent.scroll(editor)

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Toggle markdown preview'))

    let previewContent = document.querySelector('.preview__content')
    expect(previewContent).not.toBeNull()
    setScrollMetrics(previewContent, {
      scrollHeight: 1800,
      clientHeight: 300,
    })
    await waitFor(() => {
      expect(previewContent.scrollTop).toBe(330)
    })

    previewContent.scrollTop = 75
    fireEvent.scroll(previewContent)

    fireEvent.click(screen.getByLabelText('Exit markdown preview'))

    editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    setScrollMetrics(editor, {
      scrollHeight: 1200,
      clientHeight: 200,
    })
    await waitFor(() => {
      expect(editor.scrollTop).toBe(50)
    })

    editor.scrollTop = 100
    fireEvent.scroll(editor)

    fireEvent.click(screen.getByLabelText('Toggle markdown preview'))

    previewContent = document.querySelector('.preview__content')
    expect(previewContent).not.toBeNull()
    setScrollMetrics(previewContent, {
      scrollHeight: 1800,
      clientHeight: 300,
    })
    await waitFor(() => {
      expect(previewContent.scrollTop).toBe(150)
    })
  })

  it('avoids live preview scroll RAF syncing on Windows while preserving the exit scroll position', async () => {
    const restorePlatform = mockNavigatorPlatform('Win32')
    const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })

    try {
      setDefaultScrollMetrics('textarea.editor__textarea', {
        scrollHeight: 1200,
        clientHeight: 200,
      })
      setDefaultScrollMetrics('.preview__content', {
        scrollHeight: 1800,
        clientHeight: 300,
      })

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
        expect(previewContent.scrollTop).toBe(330)
      })

      requestAnimationFrameSpy.mockClear()

      previewContent.scrollTop = 75
      fireEvent.scroll(previewContent)

      expect(requestAnimationFrameSpy).not.toHaveBeenCalled()

      fireEvent.click(screen.getByLabelText('Exit markdown preview'))

      editor = document.querySelector('textarea.editor__textarea')
      expect(editor).not.toBeNull()
      await waitFor(() => {
        expect(editor.scrollTop).toBe(50)
      })
    } finally {
      requestAnimationFrameSpy.mockRestore()
      restorePlatform()
    }
  })

  it('restores markdown preview scroll position independently per tab', async () => {
    setDefaultScrollMetrics('textarea.editor__textarea', {
      scrollHeight: 1200,
      clientHeight: 200,
    })
    setDefaultScrollMetrics('.preview__content', {
      scrollHeight: 1800,
      clientHeight: 300,
    })

    render(<App />)

    let editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, {
      target: {
        value: Array.from({ length: 300 }, (_, index) => `First tab line ${index + 1}`).join('\n'),
      },
    })

    fireEvent.click(screen.getByLabelText('Expand footer controls'))
    fireEvent.click(screen.getByLabelText('Toggle markdown preview'))

    let previewContent = document.querySelector('.preview__content')
    expect(previewContent).not.toBeNull()
    previewContent.scrollTop = 210
    fireEvent.scroll(previewContent)

    fireEvent.click(screen.getByLabelText('New tab'))
    editor = document.querySelector('textarea.editor__textarea')
    expect(editor).not.toBeNull()
    fireEvent.change(editor, {
      target: {
        value: Array.from({ length: 300 }, (_, index) => `Second tab line ${index + 1}`).join('\n'),
      },
    })

    fireEvent.click(screen.getByLabelText('Toggle markdown preview'))

    previewContent = document.querySelector('.preview__content')
    expect(previewContent).not.toBeNull()
    await waitFor(() => {
      expect(previewContent.scrollTop).toBe(0)
    })

    previewContent.scrollTop = 70
    fireEvent.scroll(previewContent)

    fireEvent.click(screen.getByRole('tab', { name: /^Switch to Untitled\*?$/ }))
    previewContent = document.querySelector('.preview__content')
    expect(previewContent).not.toBeNull()
    await waitFor(() => {
      expect(previewContent.scrollTop).toBe(210)
    })

    fireEvent.click(screen.getByRole('tab', { name: /^Switch to Untitled 2\*?$/ }))
    previewContent = document.querySelector('.preview__content')
    expect(previewContent).not.toBeNull()
    await waitFor(() => {
      expect(previewContent.scrollTop).toBe(70)
    })
  })

})
