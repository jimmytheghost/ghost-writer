import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderMarkdownToSafeHtml } from './markdown'

describe('renderMarkdownToSafeHtml', () => {
  afterEach(() => {
    if (window.__TAURI_INTERNALS__) {
      delete window.__TAURI_INTERNALS__
    }
    vi.unstubAllGlobals()
  })

  it('escapes raw html and script-like input', () => {
    const output = renderMarkdownToSafeHtml('<script>alert(1)</script>')
    expect(output).not.toContain('<script')
  })

  it('does not render javascript links as clickable anchors', () => {
    const output = renderMarkdownToSafeHtml('[bad](javascript:alert(1))')
    expect(output).not.toContain('href="javascript:')
  })

  it('does not allow file protocol for clickable links', () => {
    const output = renderMarkdownToSafeHtml('[local](file:///Users/test/readme.md)')
    expect(output).not.toContain('href="file:///Users/test/readme.md"')
  })

  it('renders local filesystem image paths with spaces and quote variants', () => {
    const markdown =
      "![Ghost Writer]('/Users/jimmytheghost/Dropbox/_Personal Projects/Ghost Writer/case-study/imagery/01-hero.png’)"
    const output = renderMarkdownToSafeHtml(markdown)
    expect(output).toContain('<img')
    expect(output).toContain(
      'src="file:///Users/jimmytheghost/Dropbox/_Personal%20Projects/Ghost%20Writer/case-study/imagery/01-hero.png"',
    )
  })

  it('renders local filesystem image paths that are already URI-encoded', () => {
    const markdown =
      '![Ghost Writer](/Users/jimmytheghost/Dropbox/_Personal%20Projects/Ghost%20Writer/case-study/imagery/01-hero.png)'
    const output = renderMarkdownToSafeHtml(markdown)
    expect(output).toContain(
      'src="file:///Users/jimmytheghost/Dropbox/_Personal%20Projects/Ghost%20Writer/case-study/imagery/01-hero.png"',
    )
    expect(output).not.toContain('%2520')
  })

  it('preserves markdown image titles instead of appending them to file URL paths', () => {
    const markdown = '![Ghost Writer](/Users/jimmytheghost/Dropbox/image.png "Hero image")'
    const output = renderMarkdownToSafeHtml(markdown)
    expect(output).toContain('src="file:///Users/jimmytheghost/Dropbox/image.png"')
    expect(output).not.toContain('%22Hero%20image%22')
  })

  it('converts file image URLs to tauri asset URLs when runtime support exists', () => {
    window.__TAURI_INTERNALS__ = {
      convertFileSrc: vi.fn((filePath, protocol = 'asset') => `${protocol}://localhost/${encodeURIComponent(filePath)}`),
    }
    const markdown = '![Ghost Writer](/Users/jimmytheghost/Dropbox/image.png)'
    const output = renderMarkdownToSafeHtml(markdown)
    expect(window.__TAURI_INTERNALS__.convertFileSrc).toHaveBeenCalledWith(
      '/Users/jimmytheghost/Dropbox/image.png',
      'asset',
    )
    expect(output).toContain('src="asset://localhost/%2FUsers%2Fjimmytheghost%2FDropbox%2Fimage.png"')
  })

  it('preserves web root-relative image URLs', () => {
    const markdown = '![logo](/images/logo.png)'
    const output = renderMarkdownToSafeHtml(markdown)
    expect(output).toContain('src="/images/logo.png"')
    expect(output).not.toContain('src="file:///images/logo.png"')
  })

  it('allows markdown task-list checkboxes', () => {
    const output = renderMarkdownToSafeHtml('- [x] done')
    expect(output).toContain('type="checkbox"')
  })

  it('removes non-checkbox input elements', () => {
    const output = renderMarkdownToSafeHtml('<input type="text" value="x" />')
    expect(output).not.toContain('<input')
  })

  it('renders italic text correctly', () => {
    const output = renderMarkdownToSafeHtml('*Italicized* text')
    expect(output).toContain('<em>Italicized</em>')
  })

  it('renders footnotes and heading ids', () => {
    const markdown = '## Heading {#custom-id}\n\nFootnote ref[^1]\n\n[^1]: Footnote body'
    const output = renderMarkdownToSafeHtml(markdown)
    expect(output).toContain('id="custom-id"')
    expect(output).toContain('footnotes')
  })

  it('renders definition lists and highlight', () => {
    const markdown = 'Term\n: Definition\n\n==important=='
    const output = renderMarkdownToSafeHtml(markdown)
    expect(output).toContain('<dl>')
    expect(output).toContain('<mark>important</mark>')
  })

  it('renders emoji shortcode and sub/sup syntax', () => {
    const markdown = ':joy: H~2~O X^2^'
    const output = renderMarkdownToSafeHtml(markdown)
    expect(output).toContain('<sub>2</sub>')
    expect(output).toContain('<sup>2</sup>')
    expect(output).not.toContain(':joy:')
  })

  it('converts markdown directional arrow text for preview', () => {
    const markdown = 'Go <-- back and --> forward'
    const output = renderMarkdownToSafeHtml(markdown)
    expect(output).toContain('Go ← back and → forward')
  })
})
