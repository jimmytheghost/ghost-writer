import { describe, expect, it } from 'vitest'
import { renderMarkdownToSafeHtml } from './markdown'

describe('renderMarkdownToSafeHtml', () => {
  it('escapes raw html and script-like input', () => {
    const output = renderMarkdownToSafeHtml('<script>alert(1)</script>')
    expect(output).not.toContain('<script')
  })

  it('does not render javascript links as clickable anchors', () => {
    const output = renderMarkdownToSafeHtml('[bad](javascript:alert(1))')
    expect(output).not.toContain('href="javascript:')
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
})
