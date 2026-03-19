import { afterEach, describe, expect, it, vi } from 'vitest'

const desktopRuntimeMocks = vi.hoisted(() => ({
  isDesktopRuntime: vi.fn(),
  isMacDesktopRuntime: vi.fn(),
  printCurrentWebview: vi.fn(),
  exportPdfCurrentWebview: vi.fn(),
}))

vi.mock('./contentTransforms', () => ({
  stripInlinePromptTokensForPresentation: vi.fn((markdown) => markdown.replaceAll('{{remove me}}', '')),
}))

vi.mock('./desktopRuntime', () => desktopRuntimeMocks)

vi.mock('./markdown', () => ({
  renderMarkdownToSafeHtml: vi.fn((markdown) => `<p>${markdown}</p>`),
}))

import { exportRenderedMarkdownAsPdf, printRenderedMarkdown } from './print'

describe('printRenderedMarkdown', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.head.innerHTML = ''
    document.body.className = ''
    vi.restoreAllMocks()
    vi.clearAllTimers()
  })

  it('does not swap the visible app surface during macOS desktop native print', async () => {
    desktopRuntimeMocks.isDesktopRuntime.mockReturnValue(true)
    desktopRuntimeMocks.isMacDesktopRuntime.mockReturnValue(true)
    desktopRuntimeMocks.printCurrentWebview.mockResolvedValue(true)

    const printed = printRenderedMarkdown('# Title')

    expect(printed).toBe(true)
    expect(document.getElementById('ghost-writer-print-root')).not.toBeNull()
    expect(document.body).not.toHaveClass('ghost-writer-native-printing')

    await Promise.resolve()
    window.dispatchEvent(new Event('afterprint'))

    expect(desktopRuntimeMocks.printCurrentWebview).toHaveBeenCalledTimes(1)
  })

  it('uses native print command for non-mac desktop runtime', async () => {
    desktopRuntimeMocks.isDesktopRuntime.mockReturnValue(true)
    desktopRuntimeMocks.isMacDesktopRuntime.mockReturnValue(false)
    const printMock = vi.fn()
    vi.stubGlobal('print', printMock)

    const printed = printRenderedMarkdown('# Title')
    await Promise.resolve()

    expect(printed).toBe(true)
    expect(printMock).toHaveBeenCalledTimes(1)
    expect(desktopRuntimeMocks.printCurrentWebview).toHaveBeenCalledTimes(0)
  })

  it('emits page break helpers in the print stylesheet', () => {
    desktopRuntimeMocks.isDesktopRuntime.mockReturnValue(false)
    desktopRuntimeMocks.isMacDesktopRuntime.mockReturnValue(false)
    vi.stubGlobal('print', vi.fn())

    const formatted = printRenderedMarkdown('Heading\n\nContent')

    expect(formatted).toBe(true)
    const styleNode = document.getElementById('ghost-writer-print-style')
    expect(styleNode).not.toBeNull()
    expect(styleNode.textContent).toContain('.ghost-writer-print-main h1')
    expect(styleNode.textContent).toContain('page-break-inside: avoid')
  })

  it('exports a PDF through the desktop export command on non-mac desktop runtime', async () => {
    desktopRuntimeMocks.isDesktopRuntime.mockReturnValue(true)
    desktopRuntimeMocks.isMacDesktopRuntime.mockReturnValue(false)
    desktopRuntimeMocks.exportPdfCurrentWebview.mockImplementation(async (suggestedName) => {
      const printRoot = document.getElementById('ghost-writer-print-root')
      expect(printRoot).not.toBeNull()
      expect(printRoot?.innerHTML ?? '').toContain('<p># Title')
      expect(printRoot?.innerHTML ?? '').not.toContain('{{remove me}}')
      expect(suggestedName).toBe('exported.pdf')
      return '/tmp/exported.pdf'
    })

    const exported = await exportRenderedMarkdownAsPdf('# Title\nBody {{remove me}} text', false, 'exported.pdf')

    expect(exported).toBe('/tmp/exported.pdf')
    expect(desktopRuntimeMocks.exportPdfCurrentWebview).toHaveBeenCalledTimes(1)
    expect(desktopRuntimeMocks.exportPdfCurrentWebview).toHaveBeenCalledWith('exported.pdf')
    expect(document.getElementById('ghost-writer-print-root')).toBeNull()
  })
})
