import { marked } from 'marked'

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])
const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'del',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'input',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
])
const GLOBAL_ALLOWED_ATTRIBUTES = new Set(['class', 'title', 'aria-label'])
const ELEMENT_ALLOWED_ATTRIBUTES = {
  a: new Set(['href']),
  img: new Set(['src', 'alt']),
  input: new Set(['type', 'checked', 'disabled', 'data-source-line']),
}

marked.setOptions({
  breaks: true,
  gfm: true,
})

function isSafeUrl(rawUrl) {
  if (!rawUrl || typeof window === 'undefined') return false
  const value = rawUrl.trim()
  if (value.startsWith('#') || value.startsWith('/')) return true
  if (value.startsWith('./') || value.startsWith('../')) return true

  try {
    const parsed = new URL(value, window.location.origin)
    return SAFE_PROTOCOLS.has(parsed.protocol)
  } catch {
    return false
  }
}

function sanitizeHtml(html) {
  if (!html || typeof window === 'undefined') return html ?? ''

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const elements = [...doc.body.querySelectorAll('*')]

  for (const element of elements) {
    const tagName = element.tagName.toLowerCase()
    if (!ALLOWED_TAGS.has(tagName)) {
      element.replaceWith(...element.childNodes)
      continue
    }

    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value
      const allowedForElement = ELEMENT_ALLOWED_ATTRIBUTES[tagName]
      const isAllowedAttribute =
        GLOBAL_ALLOWED_ATTRIBUTES.has(name) || (allowedForElement ? allowedForElement.has(name) : false)

      if (!isAllowedAttribute || name.startsWith('on') || name === 'style') {
        element.removeAttribute(attribute.name)
        continue
      }

      if ((name === 'href' || name === 'src') && !isSafeUrl(value)) {
        element.removeAttribute(attribute.name)
      }
    }

    if (tagName === 'a' && element.hasAttribute('href')) {
      element.setAttribute('rel', 'noopener noreferrer')
      element.setAttribute('target', '_blank')
    }

    if (tagName === 'input') {
      const inputType = (element.getAttribute('type') || '').toLowerCase()
      if (inputType !== 'checkbox') {
        element.remove()
      }
    }
  }

  return doc.body.innerHTML
}

export function renderMarkdownToSafeHtml(markdown) {
  return sanitizeHtml(marked.parse(markdown ?? ''))
}
