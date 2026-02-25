import { describe, expect, it } from 'vitest'
import {
  collectCheckboxLineIndexes,
  extractInlinePromptTokens,
  hasInlinePromptTokens,
  normalizeCustomCheckboxLines,
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
})
