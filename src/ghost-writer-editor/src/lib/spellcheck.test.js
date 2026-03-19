import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  DEFAULT_CUSTOM_WORD_LIST,
  getMisspelledWordCounts,
  getMisspelledRanges,
  isSpellcheckReady,
  preloadSpellcheck,
  setCustomSpellcheckWords,
} from './spellcheck'

describe('spellcheck', () => {
  beforeAll(async () => {
    await preloadSpellcheck()
    expect(isSpellcheckReady()).toBe(true)
  })

  afterEach(() => {
    setCustomSpellcheckWords(DEFAULT_CUSTOM_WORD_LIST)
  })

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

  it('does not underline custom dictionary words', () => {
    setCustomSpellcheckWords(['ghostwriter'])
    expect(getMisspelledRanges('ghostwriter ')).toEqual([])
  })

  it('ignores dashed words when checking ranges and counts', () => {
    expect(getMisspelledRanges('bug-name ')).toEqual([])
    expect(getMisspelledRanges('non-destructive ')).toEqual([])
    expect(getMisspelledWordCounts('bug-name non-destructive dirty-close wierd')).toEqual([{ word: 'wierd', count: 1 }])
  })

  it('treats extension-style words in custom list as valid tokens', () => {
    setCustomSpellcheckWords(['.png'])
    expect(getMisspelledRanges('Use image.png here ')).toEqual([])
  })

  it('returns misspelled word counts for full document scan', () => {
    const results = getMisspelledWordCounts('wierd typo and wierd again, plus asdfghj token')

    expect(results).toEqual([
      { word: 'wierd', count: 2 },
      { word: 'asdfghj', count: 1 },
    ])
  })
})
