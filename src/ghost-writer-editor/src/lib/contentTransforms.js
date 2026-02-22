const CHECKBOX_LINE_PATTERN = /^(\s*)(?:([-*+])\s+)?\[( |x|X)\](.*)$/

export function normalizeCustomCheckboxLines(markdown = '') {
  return markdown
    .split('\n')
    .map((line) => {
      const match = line.match(/^(\s*)\[( |x|X)\](.*)$/)
      if (!match) return line
      const [, indentation, mark, rest] = match
      return `${indentation}- [${mark}]${rest}`
    })
    .join('\n')
}

export function collectCheckboxLineIndexes(markdown = '') {
  const lines = markdown.split('\n')
  const indexes = []

  lines.forEach((line, index) => {
    if (CHECKBOX_LINE_PATTERN.test(line)) {
      indexes.push(index)
    }
  })

  return indexes
}

export function toggleCheckboxOnLine(markdown = '', lineIndex, isChecked) {
  const lines = markdown.split('\n')
  const targetLine = lines[lineIndex]
  if (typeof targetLine !== 'string') return markdown

  const match = targetLine.match(CHECKBOX_LINE_PATTERN)
  if (!match) return markdown

  const [, indentation, bullet = '', , rest] = match
  const marker = isChecked ? 'x' : ' '
  const bulletPrefix = bullet ? `${bullet} ` : ''
  lines[lineIndex] = `${indentation}${bulletPrefix}[${marker}]${rest}`
  return lines.join('\n')
}

export function stripAssistantLeadIn(text = '') {
  if (!text) return text

  const patterns = [
    /^\s*(sure|absolutely|certainly|of course)[^.\n]*[.:]?\s*\n*/i,
    /^\s*here(?:'s| is)\s+(?:the\s+)?(?:plain\s+)?(?:markdown\s+)?(?:content|result|output)[^:\n]*:\s*\n*/i,
    /^\s*(?:output|result|response)\s*:\s*\n*/i,
  ]

  let next = text
  let changed = true
  while (changed) {
    changed = false
    for (const pattern of patterns) {
      const updated = next.replace(pattern, '')
      if (updated !== next) {
        next = updated
        changed = true
      }
    }
  }

  return next
}
