const SHARED_RULES = [
  'Return only plain markdown content.',
  'Do not include prefaces, explanations, labels, or quotes.',
  'Do not include "Sure", "Here is", or similar lead-in phrases.',
  'Do not wrap the output in code fences.',
]

export function buildGenerationPrompt({ promptText, documentText, selectedText }) {
  const request = promptText.trim()
  const hasSelection = selectedText.trim().length > 0
  const hasDocument = documentText.trim().length > 0

  if (hasSelection) {
    return [
      'You are editing part of a markdown document.',
      ...SHARED_RULES,
      'Return only the revised selected passage that satisfies the request.',
      'The revised passage may be shorter, longer, or structurally different than the original selection.',
      'Do not return the full document.',
      `User request:\n${request}`,
      `Selected text:\n${selectedText}`,
      `Full document context:\n${documentText}`,
    ].join('\n\n')
  }

  if (!hasDocument) {
    return [
      'You are writing new markdown content.',
      ...SHARED_RULES,
      `User request:\n${request}`,
    ].join('\n\n')
  }

  return [
    'You are adding content into an existing markdown document.',
    ...SHARED_RULES,
    'Return only the text to insert at the cursor.',
    'Do not return the full document.',
    `User request:\n${request}`,
    `Document context:\n${documentText}`,
  ].join('\n\n')
}

export function buildInlineGenerationPrompt({ globalPromptText, inlinePromptText, documentText }) {
  const sharedPrompt = globalPromptText.trim()
  const inlinePrompt = inlinePromptText.trim()
  const sections = [
    'You are filling an inline placeholder in a markdown document.',
    ...SHARED_RULES,
    'Return only the replacement text for the placeholder.',
    'Do not include curly braces in the output.',
  ]

  if (sharedPrompt) {
    sections.push(`Global request:\n${sharedPrompt}`)
  }

  sections.push(`Inline request:\n${inlinePrompt}`)
  sections.push(`Document context:\n${documentText}`)
  return sections.join('\n\n')
}
