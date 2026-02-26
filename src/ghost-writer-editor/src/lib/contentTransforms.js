const CHECKBOX_LINE_PATTERN = /^(\s*)(?:([-*+])\s+)?\[( |x|X)\](.*)$/

export function extractInlinePromptTokens(markdown = '') {
  const tokens = []
  let searchIndex = 0

  while (searchIndex < markdown.length) {
    const openIndex = markdown.indexOf('{{', searchIndex)
    if (openIndex === -1) break

    const closeIndex = markdown.indexOf('}}', openIndex + 2)
    if (closeIndex === -1) break

    const raw = markdown.slice(openIndex, closeIndex + 2)
    const innerText = markdown.slice(openIndex + 2, closeIndex)
    if (innerText.trim().length > 0) {
      tokens.push({
        start: openIndex,
        end: closeIndex + 2,
        raw,
        innerText,
      })
    }

    searchIndex = closeIndex + 2
  }

  return tokens
}

export function extractInlinePromptOverlayRanges(markdown = '') {
  const ranges = []
  let searchIndex = 0

  while (searchIndex < markdown.length) {
    const openIndex = markdown.indexOf('{{', searchIndex)
    if (openIndex === -1) break

    const closeIndex = markdown.indexOf('}}', openIndex + 2)
    if (closeIndex === -1) {
      ranges.push({
        start: openIndex,
        end: markdown.length,
      })
      break
    }

    ranges.push({
      start: openIndex,
      end: closeIndex + 2,
    })

    searchIndex = closeIndex + 2
  }

  return ranges
}

export function hasInlinePromptTokens(markdown = '') {
  return extractInlinePromptTokens(markdown).length > 0
}

export function stripInlinePromptTokensForPresentation(markdown = '') {
  if (!markdown) return markdown

  const tokens = extractInlinePromptTokens(markdown)
  if (!tokens.length) return markdown

  let cursor = 0
  let result = ''

  tokens.forEach((token) => {
    const safeStart = Math.max(0, Math.min(token.start, markdown.length))
    const safeEnd = Math.max(safeStart, Math.min(token.end, markdown.length))
    result += markdown.slice(cursor, safeStart)
    cursor = safeEnd
  })

  result += markdown.slice(cursor)
  return result
}

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
