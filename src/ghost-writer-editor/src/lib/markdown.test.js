import { describe, expect, it } from 'vitest'
import { renderMarkdownToSafeHtml } from './markdown'

describe('renderMarkdownToSafeHtml', () => {
  it('removes script tags and inline handlers', () => {
    const output = renderMarkdownToSafeHtml(
      '<script>alert(1)</script><img src="https://example.com/x.png" onerror="alert(1)" />',
    )

    expect(output).not.toContain('<script')
    expect(output).not.toContain('onerror')
    expect(output).toContain('<img')
  })

  it('blocks javascript protocol links', () => {
    const output = renderMarkdownToSafeHtml('[bad](javascript:alert(1))')
    expect(output).not.toContain('javascript:')
    expect(output).toContain('<a')
  })
})
