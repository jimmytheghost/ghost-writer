import { describe, expect, it } from 'vitest'
import { buildGenerationPrompt, buildInlineGenerationPrompt } from './prompting'

describe('buildGenerationPrompt', () => {
  it('builds selection-edit prompt when selected text is present', () => {
    const prompt = buildGenerationPrompt({
      promptText: 'tighten wording',
      documentText: '# Doc\nbody',
      selectedText: 'body',
    })

    expect(prompt).toContain('You are editing part of a markdown document.')
    expect(prompt).toContain('Return only the revised selected passage that satisfies the request.')
    expect(prompt).toContain('The revised passage may be shorter, longer, or structurally different than the original selection.')
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

  it('builds insertion prompt when no selection is provided', () => {
    const prompt = buildGenerationPrompt({
      promptText: 'make this clearer',
      documentText: '# Notes\nline one',
      selectedText: '   ',
    })

    expect(prompt).toContain('You are adding content into an existing markdown document.')
    expect(prompt).toContain('Return only the text to insert at the cursor.')
    expect(prompt).toContain('Do not return the full document.')
    expect(prompt).toContain('Document context:\n# Notes\nline one')
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

  it('builds inline prompt with global and inline instructions', () => {
    const prompt = buildInlineGenerationPrompt({
      globalPromptText: 'Keep wording concise.',
      inlinePromptText: 'Give a README example sentence.',
      documentText: '# Doc\nText {{Give a README example sentence.}}',
    })

    expect(prompt).toContain('You are filling an inline placeholder in a markdown document.')
    expect(prompt).toContain('Global request:\nKeep wording concise.')
    expect(prompt).toContain('Inline request:\nGive a README example sentence.')
    expect(prompt).toContain('Document context:\n# Doc\nText {{Give a README example sentence.}}')
    expect(prompt).toContain('Do not include curly braces in the output.')
  })

  it('builds inline prompt without global request when prompt input is empty', () => {
    const prompt = buildInlineGenerationPrompt({
      globalPromptText: '   ',
      inlinePromptText: 'expand this sentence',
      documentText: 'Body {{expand this sentence}}',
    })

    expect(prompt).not.toContain('Global request:')
    expect(prompt).toContain('Inline request:\nexpand this sentence')
  })
})
