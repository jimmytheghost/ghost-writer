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

  it('renders local gif image paths from wrapped filesystem paths', () => {
    const markdown =
      "![Inline prompt animation]('/Users/jimmytheghost/Dropbox/_Personal Projects/Ghost Writer/case-study/imagery/03-inline-prompts-3.gif')"
    const output = renderMarkdownToSafeHtml(markdown)
    expect(output).toContain('<img')
    expect(output).toContain(
      'src="file:///Users/jimmytheghost/Dropbox/_Personal%20Projects/Ghost%20Writer/case-study/imagery/03-inline-prompts-3.gif"',
    )
  })

  it('renders local gif link syntax as an image when path points to a local image file', () => {
    const markdown =
      "[Inline Prompt Token Example]('/Users/jimmytheghost/Dropbox/_Personal Projects/Ghost Writer/case-study/imagery/03-inline-prompts-3.gif')"
    const output = renderMarkdownToSafeHtml(markdown)
    expect(output).toContain('<img')
    expect(output).not.toContain('<a ')
    expect(output).toContain(
      'src="file:///Users/jimmytheghost/Dropbox/_Personal%20Projects/Ghost%20Writer/case-study/imagery/03-inline-prompts-3.gif"',
    )
  })

  it('renders quoted local image links as images when markdown destination includes a title', () => {
    const markdown = "[Inline Prompt Token Example]('/Users/jimmytheghost/Dropbox/animated.gif' \"Animated preview\")"
    const output = renderMarkdownToSafeHtml(markdown)
    expect(output).toContain('<img')
    expect(output).not.toContain('<a ')
    expect(output).toContain('src="file:///Users/jimmytheghost/Dropbox/animated.gif"')
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

  it('converts local gif file URLs to tauri asset URLs when runtime support exists', () => {
    window.__TAURI_INTERNALS__ = {
      convertFileSrc: vi.fn((filePath, protocol = 'asset') => `${protocol}://localhost/${encodeURIComponent(filePath)}`),
    }
    const markdown = '![Animated demo](/Users/jimmytheghost/Dropbox/animated.gif)'
    const output = renderMarkdownToSafeHtml(markdown)
    expect(window.__TAURI_INTERNALS__.convertFileSrc).toHaveBeenCalledWith(
      '/Users/jimmytheghost/Dropbox/animated.gif',
      'asset',
    )
    expect(output).toContain('src="asset://localhost/%2FUsers%2Fjimmytheghost%2FDropbox%2Fanimated.gif"')
  })

  it('preserves web root-relative image URLs', () => {
    const markdown = '![logo](/images/logo.png)'
    const output = renderMarkdownToSafeHtml(markdown)
    expect(output).toContain('src="/images/logo.png"')
    expect(output).not.toContain('src="file:///images/logo.png"')
  })

  it('renders markdown task-list toggles as preview buttons', () => {
    const output = renderMarkdownToSafeHtml('- [x] done')
    expect(output).toContain('type="button"')
    expect(output).toContain('data-preview-checkbox="true"')
    expect(output).toContain('aria-pressed="true"')
  })

  it('renders task-list checkboxes with their final preview button class in the initial html', () => {
    const output = renderMarkdownToSafeHtml('- [ ] task')
    expect(output).toContain('class="task-list-item-checkbox preview__checkbox"')
    expect(output).toContain('type="button"')
    expect(output).toContain('aria-pressed="false"')
    expect(output).not.toContain('type="checkbox"')
  })

  it('wraps task-list item content in a stable container next to the checkbox', () => {
    const output = renderMarkdownToSafeHtml(
      '- [ ] Run installer: `src/ghost-writer-editor/src-tauri/target/release/bundle/nsis/Ghost Writer_1.4.7_x64-setup.exe`',
    )
    expect(output).toContain('<div class="preview__task-content">')
    expect(output).toContain('<wbr>')
    expect(output).toContain('<code class="preview__path">src/')
    expect(output).toContain('setup.exe</code>')
  })

  it('keeps nested task-list markdown content in block layout without invalid inline wrappers', () => {
    const output = renderMarkdownToSafeHtml(`## Active Work

### Release Blockers

- [ ] Fix the Windows cursor/input desync that still reproduces in longer documents.
  - Current status: cursor handling was hardened in the current \`1.4.18\` track, but further testing confirmed the bug still remains.
  - Observed behavior:
    \`\`\`text
    Cursor issues remain    |
    \`\`\`
    \`\`\`text
    At the end of a | line.
    \`\`\`
  - Impact: the visible caret can drift away from the real insertion point, which makes editing and deletion unreliable.
  - Current implementation decision:
    - On Windows, Ghost Writer will stop relying on persistent blurred editor-text overlays to show saved selections.
    - The Windows editor should keep native text/caret behavior stable and preserve selection intent in app state instead.
    - When focus moves from the editor to the prompt input, Windows should show prompt-adjacent selected-text context rather than a duplicated in-editor selection overlay.
    - macOS keeps the current persistent in-editor selection-highlight behavior unless later testing shows the same instability there.

- [ ] Make native Save/Open dialogs stay above the app window when \`Pin to Top\` is enabled.
  - Goal: dialog windows must not hide behind the always-on-top Ghost Writer window.

- [ ] Run manual install smoke tests on both Windows and macOS before calling \`1.5.0\` production-ready.
  - Windows checklist: \`docs/manual-install-smoke-test-windows.md\`
  - macOS checklist: \`docs/manual-install-smoke-test-macos.md\`
  - Signoff intent: manual verification will be performed on a real PC and a real Mac.`)

    expect(output).toContain('<div class="preview__task-content">')
    expect(output).not.toContain('<span class="preview__task-content">')
    expect(output).toContain('<pre><code class="language-text">Cursor issues remain    |')
    expect(output).toContain('<pre><code class="language-text">At the end of a | line.')
    expect(output).toContain('<li>Current status: cursor handling was hardened')
    expect(output).toContain('<li>Goal: dialog windows must not hide behind the always-on-top Ghost Writer window.</li>')
    expect(output).toContain('<li>Windows checklist: <code class="preview__path">docs/')
  })

  it('marks inline filesystem paths for path-specific preview styling', () => {
    const output =
      renderMarkdownToSafeHtml('Run installer: `src/ghost-writer-editor/src-tauri/target/release/bundle/nsis/Ghost Writer_1.4.7_x64-setup.exe`')
    expect(output).toContain('<code class="preview__path">')
  })

  it('wraps standalone filesystem path lines in code so preview path styling still applies', () => {
    const output = renderMarkdownToSafeHtml(
      '- [ ] Install and launch:\n  - Run installer:\n    src/ghost-writer-editor/src-tauri/target/release/bundle/nsis/Ghost Writer_1.4.7_x64-setup.exe',
    )
    expect(output).toContain('<pre><code class="preview__path preview__path--standalone">src/')
    expect(output).toContain('<wbr>')
    expect(output).toContain('setup.exe</code></pre>')
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
