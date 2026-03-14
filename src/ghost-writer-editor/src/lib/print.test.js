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
    vi.unstubAllGlobals()
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

  it('adds print formatting that avoids page breaks through text blocks', () => {
    desktopRuntimeMocks.isDesktopRuntime.mockReturnValue(false)
    vi.stubGlobal('print', vi.fn())

    const printed = printRenderedMarkdown('Paragraph text')
    const printStyle = document.getElementById('ghost-writer-print-style')

    expect(printed).toBe(true)
    expect(printStyle?.textContent ?? '').toContain('.ghost-writer-print-main p,')
    expect(printStyle?.textContent ?? '').toContain('break-inside: avoid-page;')
    expect(printStyle?.textContent ?? '').toContain('orphans: 3;')
    expect(printStyle?.textContent ?? '').toContain('widows: 3;')
    expect(printStyle?.textContent ?? '').toContain('.ghost-writer-print-main h1,')
    expect(printStyle?.textContent ?? '').toContain('break-after: avoid-page;')
  })
})
