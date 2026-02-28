import MarkdownIt from 'markdown-it'
import markdownItAttrs from 'markdown-it-attrs'
import markdownItDeflist from 'markdown-it-deflist'
import { full as markdownItEmojiFull } from 'markdown-it-emoji'
import markdownItFootnote from 'markdown-it-footnote'
import markdownItMark from 'markdown-it-mark'
import markdownItSub from 'markdown-it-sub'
import markdownItSup from 'markdown-it-sup'
import markdownItTaskLists from 'markdown-it-task-lists'

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])
const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'dd',
  'del',
  'div',
  'dl',
  'dt',
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
  'mark',
  'ol',
  'p',
  'pre',
  's',
  'section',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
])
const GLOBAL_ALLOWED_ATTRIBUTES = new Set(['class', 'title', 'aria-label', 'id'])
const ELEMENT_ALLOWED_ATTRIBUTES = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt']),
  input: new Set(['type', 'checked', 'disabled', 'data-source-line']),
}

const markdownRenderer = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: true,
  typographer: false,
})
  .use(markdownItFootnote)
  .use(markdownItDeflist)
  .use(markdownItMark)
  .use(markdownItSub)
  .use(markdownItSup)
  .use(markdownItAttrs)
  .use(markdownItEmojiFull)
  .use(markdownItTaskLists, { enabled: true, label: true })

function normalizeDirectionalArrows(markdown = '') {
  return String(markdown)
    .replaceAll('<--', '←')
    .replaceAll('-->', '→')
}

export function isSafeMarkdownUrl(rawUrl) {
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

      if ((name === 'href' || name === 'src') && !isSafeMarkdownUrl(value)) {
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
  return sanitizeHtml(markdownRenderer.render(normalizeDirectionalArrows(markdown ?? '')))
}
