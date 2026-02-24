import { describe, expect, it } from 'vitest'
import { getMisspelledRanges } from './spellcheck'

describe('spellcheck', () => {
  it('does not underline a misspelled word while it is still being typed', () => {
    expect(getMisspelledRanges('asdfghj')).toEqual([])
  })

  it('underlines a misspelled word after whitespace commits it', () => {
    const ranges = getMisspelledRanges('asdfghj ')
    expect(ranges).toHaveLength(1)
    expect(ranges[0]).toEqual({ start: 0, end: 7 })
  })

  it('still underlines a committed misspelling with punctuation before the space', () => {
    const ranges = getMisspelledRanges('asdfghj, next')
    expect(ranges).toHaveLength(1)
    expect(ranges[0]).toEqual({ start: 0, end: 7 })
  })
})
