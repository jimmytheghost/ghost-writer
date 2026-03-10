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
  'button',
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
  button: new Set(['type', 'data-preview-checkbox', 'aria-pressed', 'data-source-line']),
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
  .use(markdownItTaskLists, { enabled: true, label: false })

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

function normalizeStandaloneFilesystemPathLines(markdown = '') {
  const lines = String(markdown).split('\n')
  let activeFenceMarker = ''

  return lines
    .map((line) => {
      const trimmed = line.trim()
      const fenceMatch = trimmed.match(/^(```+|~~~+)/)
      if (fenceMatch) {
        const marker = fenceMatch[1][0]
        activeFenceMarker = activeFenceMarker === marker ? '' : marker
        return line
      }

      if (activeFenceMarker) return line
      if (!trimmed || !looksLikeInlineFilesystemPath(trimmed)) return line
      if (/^`+.*`+$/.test(trimmed)) return line

      const leadingWhitespace = line.match(/^\s*/)?.[0] ?? ''
      const tickWrapper = trimmed.includes('`') ? '``' : '`'
      return `${leadingWhitespace}${tickWrapper}${trimmed}${tickWrapper}`
    })
    .join('\n')
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

function looksLikeInlineFilesystemPath(value = '') {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return false
  if (looksLikeFilesystemPath(trimmed)) return true
  if (trimmed.includes('://')) return false
  if (!(trimmed.includes('/') || trimmed.includes('\\'))) return false
  if (/^[#@]/.test(trimmed)) return false
  if (!/[a-zA-Z0-9_-][\\/]/.test(trimmed) && !/^\.\.?[\\/]/.test(trimmed)) return false
  return /[\\/][^\\/]+\.[a-zA-Z0-9]{1,8}$/.test(trimmed)
}

function normalizeUriEncoding(value = '') {
  if (!value) return value
  try {
    return decodeURI(value)
  } catch {
    return value
  }
}

function addFilesystemPathWrapHints(element, doc) {
  const text = element.textContent ?? ''
  if (!text) return

  const fragment = doc.createDocumentFragment()
  const segments = text.split(/([\\/ _-]+)/)

  for (const segment of segments) {
    if (!segment) continue
    fragment.append(doc.createTextNode(segment))
    if (/[\\/ _-]+/.test(segment)) {
      fragment.append(doc.createElement('wbr'))
    }
  }

  element.replaceChildren(fragment)
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

    if (
      tagName === 'code' &&
      element.parentElement?.tagName.toLowerCase() !== 'pre' &&
      looksLikeInlineFilesystemPath(element.textContent ?? '')
    ) {
      element.classList.add('preview__path')
      addFilesystemPathWrapHints(element, doc)
      let previousSibling = element.previousSibling
      while (previousSibling?.nodeType === Node.TEXT_NODE && !previousSibling.textContent?.trim()) {
        previousSibling = previousSibling.previousSibling
      }
      if (previousSibling?.nodeType === Node.ELEMENT_NODE && previousSibling.nodeName.toLowerCase() === 'br') {
        element.classList.add('preview__path--standalone')
        const pre = doc.createElement('pre')
        element.replaceWith(pre)
        pre.append(element)
      }
    }

    if (tagName === 'input') {
      const inputType = (element.getAttribute('type') || '').toLowerCase()
      if (inputType !== 'checkbox') {
        element.remove()
        continue
      }

      const checkboxButton = doc.createElement('button')
      const isChecked = element.hasAttribute('checked')
      checkboxButton.type = 'button'
      checkboxButton.className = 'task-list-item-checkbox preview__checkbox'
      checkboxButton.setAttribute('data-preview-checkbox', 'true')
      checkboxButton.setAttribute('aria-label', 'Toggle task checkbox')
      checkboxButton.setAttribute('aria-pressed', isChecked ? 'true' : 'false')
      element.replaceWith(checkboxButton)
    }
  }

  const taskListItems = [...doc.body.querySelectorAll('li.task-list-item')]
  for (const item of taskListItems) {
    let directCheckbox = [...item.children].find((child) => {
      const tagName = child.tagName.toLowerCase()
      if (tagName === 'button') {
        return child.getAttribute('data-preview-checkbox') === 'true'
      }
      return tagName === 'input' && (child.getAttribute('type') || '').toLowerCase() === 'checkbox'
    })
    let sourceContainer = null

    if (!directCheckbox) {
      const firstParagraph = [...item.children].find((child) => child.tagName.toLowerCase() === 'p')
      const paragraphCheckbox = [...(firstParagraph?.children ?? [])].find((child) => {
        const tagName = child.tagName.toLowerCase()
        if (tagName === 'button') {
          return child.getAttribute('data-preview-checkbox') === 'true'
        }
        return tagName === 'input' && (child.getAttribute('type') || '').toLowerCase() === 'checkbox'
      })

      if (paragraphCheckbox) {
        directCheckbox = paragraphCheckbox
        sourceContainer = firstParagraph
      }
    }

    if (!directCheckbox) continue

    const nestedLists = []
    const contentWrapper = doc.createElement('div')
    contentWrapper.className = 'preview__task-content'

    if (sourceContainer) {
      directCheckbox.remove()
      item.insertBefore(directCheckbox, sourceContainer)

      for (const node of [...sourceContainer.childNodes]) {
        if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) continue
        contentWrapper.append(node)
      }

      sourceContainer.remove()
    }

    for (const node of [...item.childNodes]) {
      if (node === directCheckbox) continue
      if (node === sourceContainer) continue

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = /** @type {HTMLElement} */ (node)
        const tagName = element.tagName.toLowerCase()
        if (tagName === 'ul' || tagName === 'ol') {
          nestedLists.push(element)
          continue
        }
      }

      if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) continue
      contentWrapper.append(node)
    }

    if (contentWrapper.childNodes.length) {
      item.insertBefore(contentWrapper, nestedLists[0] ?? null)
    }

    for (const nestedList of nestedLists) {
      item.append(nestedList)
    }
  }

  return doc.body.innerHTML
}

export function renderMarkdownToSafeHtml(markdown) {
  const normalizedMarkdown = normalizeMarkdownImagePaths(
    normalizeStandaloneFilesystemPathLines(normalizeDirectionalArrows(markdown ?? '')),
  )
  return sanitizeHtml(markdownRenderer.render(normalizedMarkdown))
}
