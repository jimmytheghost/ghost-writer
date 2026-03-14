import { afterEach, describe, expect, it, vi } from 'vitest'

const desktopRuntimeMocks = vi.hoisted(() => ({
  isDesktopRuntime: vi.fn(),
  printCurrentWebview: vi.fn(),
}))

const markdownMocks = vi.hoisted(() => ({
  renderMarkdownToSafeHtml: vi.fn((markdown) => `<p>${markdown}</p>`),
}))

vi.mock('./contentTransforms', () => ({
  stripInlinePromptTokensForPresentation: vi.fn((markdown) => markdown.replaceAll('{{remove me}}', '')),
}))

vi.mock('./desktopRuntime', () => desktopRuntimeMocks)

vi.mock('./markdown', () => markdownMocks)

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

  it('groups headings with their following content into print sections', () => {
    desktopRuntimeMocks.isDesktopRuntime.mockReturnValue(false)
    vi.stubGlobal('print', vi.fn())
    const headingHtml = [
      '<h1>Core Release Checks</h1>',
      '<ul><li>Windows text selection</li><li>print/PDF/export flows</li></ul>',
      '<h2>First Launch Checks</h2>',
      '<p>Confirm the window opens centered.</p>',
    ].join('')
    markdownMocks.renderMarkdownToSafeHtml.mockReturnValueOnce(headingHtml)

    const printed = printRenderedMarkdown('# Export checks')
    const printRoot = document.getElementById('ghost-writer-print-root')

    expect(printed).toBe(true)
    expect(printRoot?.innerHTML ?? '').toContain('class="ghost-writer-print-section"')
    expect(printRoot?.innerHTML ?? '').toContain('<section class="ghost-writer-print-section"><h1>Core Release Checks</h1><ul><li>Windows text selection</li><li>print/PDF/export flows</li></ul></section>')
    expect(printRoot?.innerHTML ?? '').toContain('<section class="ghost-writer-print-section"><h2>First Launch Checks</h2><p>Confirm the window opens centered.</p></section>')
  })
})
