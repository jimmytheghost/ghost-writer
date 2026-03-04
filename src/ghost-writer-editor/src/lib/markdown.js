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
const QUOTE_CHARS = new Set(["'", '"', '‘', '’', '“', '”'])
const QUOTE_PAIRS = Object.freeze({
  "'": "'",
  '"': '"',
  '‘': '’',
  '’': '’',
  '“': '”',
  '”': '”',
})
const IMAGE_EXTENSIONS = new Set(['.gif', '.png', '.jpg', '.jpeg', '.webp', '.bmp', '.svg', '.avif'])
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

const defaultValidateLink = markdownRenderer.validateLink.bind(markdownRenderer)
markdownRenderer.validateLink = (url) => {
  if (String(url ?? '').trim().startsWith('file://')) return true
  return defaultValidateLink(url)
}

function normalizeDirectionalArrows(markdown = '') {
  return String(markdown)
    .replaceAll('<--', '←')
    .replaceAll('-->', '→')
}

function trimWrappingQuotes(value = '') {
  if (!value) return value
  const trimmed = value.trim()
  if (trimmed.length < 2) return trimmed
  if (!QUOTE_CHARS.has(trimmed[0]) || !QUOTE_CHARS.has(trimmed[trimmed.length - 1])) return trimmed
  return trimmed.slice(1, -1).trim()
}

function looksLikeFilesystemPath(value = '') {
  if (!value) return false
  if (value.startsWith('file://')) return true
  if (
    value.startsWith('/Users/') ||
    value.startsWith('/home/') ||
    value.startsWith('/tmp/') ||
    value.startsWith('/var/') ||
    value.startsWith('/private/') ||
    value.startsWith('/Volumes/')
  ) {
    return true
  }
  if (/^[a-zA-Z]:[\\/]/.test(value)) return true
  return false
}

function normalizeUriEncoding(value = '') {
  if (!value) return value
  try {
    return decodeURI(value)
  } catch {
    return value
  }
}

function extractMarkdownImageDestination(rawDestination = '') {
  if (!rawDestination) return ''
  const trimmed = String(rawDestination).trim()
  if (!trimmed) return ''

  const openingQuote = trimmed[0]
  const expectedClosingQuote = QUOTE_PAIRS[openingQuote]
  if (expectedClosingQuote) {
    const closingQuoteIndex = trimmed.indexOf(expectedClosingQuote, 1)
    if (closingQuoteIndex > 0) {
      return trimmed.slice(1, closingQuoteIndex).trim()
    }
  }

  const unwrapped = trimWrappingQuotes(trimmed)
  if (unwrapped !== trimmed) return unwrapped

  if (trimmed.startsWith('<')) {
    const closingBracketIndex = trimmed.indexOf('>')
    if (closingBracketIndex > 0) {
      return trimmed.slice(1, closingBracketIndex).trim()
    }
  }

  const firstToken = trimmed.split(/\s+/, 1)[0]
  return firstToken ?? ''
}

function toFileUrl(pathValue = '') {
  if (!pathValue) return pathValue
  const normalizedPath = normalizeUriEncoding(pathValue)

  if (normalizedPath.startsWith('file://')) {
    return encodeURI(normalizedPath)
  }

  if (/^[a-zA-Z]:[\\/]/.test(normalizedPath)) {
    const normalizedWindowsPath = normalizedPath.replaceAll('\\', '/')
    return `file:///${encodeURI(normalizedWindowsPath)}`
  }

  return `file://${encodeURI(normalizedPath)}`
}

function normalizeMarkdownImagePaths(markdown = '') {
  const withImageLinksNormalized = String(markdown).replaceAll(
    /\[([^\]]*)\]\(([^)\n]+)\)/g,
    (fullMatch, altText, rawDestination, index, sourceText) => {
      if (sourceText[index - 1] === '!') return fullMatch
      const cleanDestination = extractMarkdownImageDestination(rawDestination)
      if (!looksLikeFilesystemPath(cleanDestination)) return fullMatch
      if (!isLocalImagePath(cleanDestination)) return fullMatch
      return `![${altText}](${rawDestination})`
    },
  )

  return withImageLinksNormalized.replaceAll(/!\[([^\]]*)\]\(([^)\n]+)\)/g, (fullMatch, altText, rawDestination) => {
    const cleanDestination = extractMarkdownImageDestination(rawDestination)
    if (!looksLikeFilesystemPath(cleanDestination)) return fullMatch
    return `![${altText}](${toFileUrl(cleanDestination)})`
  })
}

function isLocalImagePath(pathValue = '') {
  if (!pathValue) return false
  const normalizedPath = normalizeUriEncoding(pathValue).toLowerCase()
  const pathWithoutQuery = normalizedPath.split('#', 1)[0].split('?', 1)[0]
  for (const extension of IMAGE_EXTENSIONS) {
    if (pathWithoutQuery.endsWith(extension)) return true
  }
  return false
}

function fileUrlToPath(fileUrl = '') {
  if (!fileUrl) return fileUrl
  if (!fileUrl.startsWith('file://')) return fileUrl

  try {
    const parsed = new URL(fileUrl)
    let pathname = decodeURIComponent(parsed.pathname)
    if (/^\/[a-zA-Z]:\//.test(pathname)) {
      pathname = pathname.slice(1)
    }
    return pathname
  } catch {
    return fileUrl.slice('file://'.length)
  }
}

function toRuntimeImageUrl(url = '') {
  if (!url || typeof window === 'undefined') return url
  if (!url.startsWith('file://')) return url
  const convertFileSrc = window.__TAURI_INTERNALS__?.convertFileSrc
  if (typeof convertFileSrc !== 'function') return url

  try {
    return convertFileSrc(fileUrlToPath(url), 'asset')
  } catch {
    return url
  }
}

export function isSafeMarkdownUrl(rawUrl, options = {}) {
  const { allowFileProtocol = false, allowAssetProtocol = false } = options
  if (!rawUrl || typeof window === 'undefined') return false
  const value = rawUrl.trim()
  if (value.startsWith('#') || value.startsWith('/')) return true
  if (value.startsWith('./') || value.startsWith('../')) return true

  try {
    const parsed = new URL(value, window.location.origin)
    if (allowFileProtocol && parsed.protocol === 'file:') return true
    if (allowAssetProtocol && parsed.protocol === 'asset:') return true
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
      const normalizedValue = tagName === 'img' && name === 'src' ? toRuntimeImageUrl(value) : value
      const allowedForElement = ELEMENT_ALLOWED_ATTRIBUTES[tagName]
      const isAllowedAttribute =
        GLOBAL_ALLOWED_ATTRIBUTES.has(name) || (allowedForElement ? allowedForElement.has(name) : false)

      if (!isAllowedAttribute || name.startsWith('on') || name === 'style') {
        element.removeAttribute(attribute.name)
        continue
      }

      if (
        (name === 'href' || name === 'src') &&
        !isSafeMarkdownUrl(normalizedValue, {
          allowFileProtocol: tagName === 'img' && name === 'src',
          allowAssetProtocol: tagName === 'img' && name === 'src',
        })
      ) {
        element.removeAttribute(attribute.name)
        continue
      }

      if (normalizedValue !== value) {
        element.setAttribute(attribute.name, normalizedValue)
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
  const normalizedMarkdown = normalizeMarkdownImagePaths(normalizeDirectionalArrows(markdown ?? ''))
  return sanitizeHtml(markdownRenderer.render(normalizedMarkdown))
}
