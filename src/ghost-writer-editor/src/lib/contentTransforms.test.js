import { describe, expect, it } from 'vitest'
import {
  collectCheckboxLineIndexes,
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
})
