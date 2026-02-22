export function buildGenerationPrompt({ promptText, documentText, selectedText }) {
  const request = promptText.trim()
  const hasSelection = selectedText.trim().length > 0
  const hasDocument = documentText.trim().length > 0

  const sharedRules = [
    'Return only plain markdown content.',
    'Do not include prefaces, explanations, labels, or quotes.',
    'Do not include "Sure", "Here is", or similar lead-in phrases.',
    'Do not wrap the output in code fences.',
  ]

  if (hasSelection) {
    return [
      'You are editing part of a markdown document.',
      ...sharedRules,
      'Rewrite only the selected text to satisfy the request.',
      'Do not return the full document.',
      `User request:\n${request}`,
      `Selected text:\n${selectedText}`,
      `Full document context:\n${documentText}`,
    ].join('\n\n')
  }

  if (!hasDocument) {
    return [
      'You are writing new markdown content.',
      ...sharedRules,
      `User request:\n${request}`,
    ].join('\n\n')
  }

  return [
    'You are editing an entire markdown document.',
    ...sharedRules,
    'Return the full updated document only.',
    `User request:\n${request}`,
    `Current document:\n${documentText}`,
  ].join('\n\n')
}
