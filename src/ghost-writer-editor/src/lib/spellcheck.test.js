import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  DEFAULT_CUSTOM_WORD_LIST,
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

  it('treats extension-style words in custom list as valid tokens', () => {
    setCustomSpellcheckWords(['.png'])
    expect(getMisspelledRanges('Use image.png here ')).toEqual([])
  })
})
