import { afterEach, describe, expect, it, vi } from 'vitest'

const desktopRuntimeMocks = vi.hoisted(() => ({
  isDesktopRuntime: vi.fn(),
  printCurrentWebview: vi.fn(),
}))

vi.mock('./contentTransforms', () => ({
  stripInlinePromptTokensForPresentation: vi.fn((markdown) => markdown.replaceAll('{{remove me}}', '')),
}))

vi.mock('./desktopRuntime', () => desktopRuntimeMocks)

vi.mock('./markdown', () => ({
  renderMarkdownToSafeHtml: vi.fn((markdown) => `<p>${markdown}</p>`),
}))

import { printRenderedMarkdown } from './print'

describe('printRenderedMarkdown', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.head.innerHTML = ''
    document.body.className = ''
    vi.restoreAllMocks()
    vi.clearAllTimers()
  })

  it('does not swap the visible app surface during desktop native print', async () => {
    desktopRuntimeMocks.isDesktopRuntime.mockReturnValue(true)
    desktopRuntimeMocks.printCurrentWebview.mockResolvedValue(true)

    const printed = printRenderedMarkdown('# Title')

    expect(printed).toBe(true)
    expect(document.getElementById('ghost-writer-print-root')).not.toBeNull()
    expect(document.body).not.toHaveClass('ghost-writer-native-printing')

    await Promise.resolve()

    expect(desktopRuntimeMocks.printCurrentWebview).toHaveBeenCalledTimes(1)
  })

  it('emits page break helpers in the print stylesheet', () => {
    desktopRuntimeMocks.isDesktopRuntime.mockReturnValue(false)
    vi.stubGlobal('print', vi.fn())

    const formatted = printRenderedMarkdown('Heading\n\nContent')

    expect(formatted).toBe(true)
    const styleNode = document.getElementById('ghost-writer-print-style')
    expect(styleNode).not.toBeNull()
    expect(styleNode.textContent).toContain('.ghost-writer-print-main h1')
    expect(styleNode.textContent).toContain('page-break-inside: avoid')
  })
})
