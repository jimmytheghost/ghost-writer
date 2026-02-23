import { describe, expect, it } from 'vitest'
import { buildGenerationPrompt } from './prompting'

describe('buildGenerationPrompt', () => {
  it('builds selection-edit prompt when selected text is present', () => {
    const prompt = buildGenerationPrompt({
      promptText: 'tighten wording',
      documentText: '# Doc\nbody',
      selectedText: 'body',
    })

    expect(prompt).toContain('You are editing part of a markdown document.')
    expect(prompt).toContain('Rewrite only the selected text to satisfy the request.')
    expect(prompt).toContain('Selected text:\nbody')
    expect(prompt).toContain('Full document context:\n# Doc\nbody')
  })

  it('builds new-document prompt when document is empty', () => {
    const prompt = buildGenerationPrompt({
      promptText: 'write a launch announcement',
      documentText: '   ',
      selectedText: '',
    })

    expect(prompt).toContain('You are writing new markdown content.')
    expect(prompt).toContain('User request:\nwrite a launch announcement')
    expect(prompt).not.toContain('Current document:')
  })

  it('builds full-document edit prompt when no selection is provided', () => {
    const prompt = buildGenerationPrompt({
      promptText: 'make this clearer',
      documentText: '# Notes\nline one',
      selectedText: '   ',
    })

    expect(prompt).toContain('You are editing an entire markdown document.')
    expect(prompt).toContain('Return the full updated document only.')
    expect(prompt).toContain('Current document:\n# Notes\nline one')
  })

  it('always includes output-hardening instructions', () => {
    const prompt = buildGenerationPrompt({
      promptText: 'test',
      documentText: '',
      selectedText: '',
    })

    expect(prompt).toContain('Return only plain markdown content.')
    expect(prompt).toContain('Do not include prefaces, explanations, labels, or quotes.')
    expect(prompt).toContain('Do not wrap the output in code fences.')
  })
})
