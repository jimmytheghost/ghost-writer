import { describe, expect, it } from 'vitest'
import {
  collectCheckboxLineIndexes,
  extractInlinePromptOverlayRanges,
  extractInlinePromptTokens,
  hasInlinePromptTokens,
  normalizeCustomCheckboxLines,
  stripInlinePromptTokensForPresentation,
  stripAssistantLeadIn,
  toggleCheckboxOnLine,
} from './contentTransforms'

describe('content transforms', () => {
  it('normalizes leading custom checkbox syntax to markdown task list items', () => {
    const input = '[ ] todo\n  [x] done\n- [ ] already markdown'
    const output = normalizeCustomCheckboxLines(input)

    expect(output).toBe('- [ ] todo\n  - [x] done\n- [ ] already markdown')
  })

  it('collects checkbox line indexes for plain and bulleted task formats', () => {
    const markdown = 'intro\n[ ] one\n- [x] two\n+ [ ] three\nnot a checkbox'
    expect(collectCheckboxLineIndexes(markdown)).toEqual([1, 2, 3])
  })

  it('toggles checkbox state while preserving indentation and bullet style', () => {
    const markdown = '  - [ ] task'
    expect(toggleCheckboxOnLine(markdown, 0, true)).toBe('  - [x] task')
    expect(toggleCheckboxOnLine(markdown, 0, false)).toBe('  - [ ] task')
  })

  it('collects and toggles numbered task list items', () => {
    const markdown = '1. [ ] first task\n2. [x] second task'

    expect(collectCheckboxLineIndexes(markdown)).toEqual([0, 1])
    expect(toggleCheckboxOnLine(markdown, 0, true)).toBe('1. [x] first task\n2. [x] second task')
    expect(toggleCheckboxOnLine(markdown, 1, false)).toBe('1. [ ] first task\n2. [ ] second task')
  })

  it('collects and toggles checkbox lines from CRLF markdown', () => {
    const markdown = '# Title\r\n\r\n- [ ] Windows task\r\n- [x] Existing task\r\n'

    expect(collectCheckboxLineIndexes(markdown)).toEqual([2, 3])
    expect(toggleCheckboxOnLine(markdown, 2, true)).toBe('# Title\n\n- [x] Windows task\n- [x] Existing task\n')
  })

  it('strips common assistant lead-ins repeatedly until content starts', () => {
    const input = 'Sure:\nHere is the output:\nResponse:\n## Final text'
    expect(stripAssistantLeadIn(input)).toBe('## Final text')
  })

  it('extracts inline prompt tokens with source ranges', () => {
    const markdown = 'Lead {{first prompt}} middle {{ second prompt }} tail'
    expect(extractInlinePromptTokens(markdown)).toEqual([
      {
        start: 5,
        end: 21,
        raw: '{{first prompt}}',
        innerText: 'first prompt',
      },
      {
        start: 29,
        end: 48,
        raw: '{{ second prompt }}',
        innerText: ' second prompt ',
      },
    ])
  })

  it('ignores whitespace-only and unmatched inline prompt tokens', () => {
    const markdown = 'One {{   }} two {{valid}} three {{broken'
    expect(extractInlinePromptTokens(markdown)).toEqual([
      {
        start: 16,
        end: 25,
        raw: '{{valid}}',
        innerText: 'valid',
      },
    ])
  })

  it('supports multiline inline prompts and quick token checks', () => {
    const markdown = 'Intro {{line one\nline two}} outro'
    expect(hasInlinePromptTokens(markdown)).toBe(true)
    expect(extractInlinePromptTokens(markdown)[0]?.innerText).toBe('line one\nline two')
    expect(hasInlinePromptTokens('No tokens here')).toBe(false)
  })

  it('extracts inline prompt overlay ranges for closed and open tokens', () => {
    const markdown = 'A {{closed}} B {{open token'
    expect(extractInlinePromptOverlayRanges(markdown)).toEqual([
      {
        start: 2,
        end: 12,
      },
      {
        start: 15,
        end: markdown.length,
      },
    ])
  })

  it('extracts inline prompt overlay range immediately after open braces', () => {
    expect(extractInlinePromptOverlayRanges('{{')).toEqual([
      {
        start: 0,
        end: 2,
      },
    ])
  })

  it('strips inline prompt tokens for presentation while preserving unmatched braces', () => {
    expect(stripInlinePromptTokensForPresentation('Before {{prompt}} after')).toBe('Before  after')
    expect(stripInlinePromptTokensForPresentation('A {{one}}{{two}} B')).toBe('A  B')
    expect(stripInlinePromptTokensForPresentation('A {{   }} B')).toBe('A {{   }} B')
    expect(stripInlinePromptTokensForPresentation('A {{broken B')).toBe('A {{broken B')
  })

  it('strips multiline inline prompt tokens for presentation', () => {
    const markdown = 'Start {{line one\nline two}} End'
    expect(stripInlinePromptTokensForPresentation(markdown)).toBe('Start  End')
  })
})
