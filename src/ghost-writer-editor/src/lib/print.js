import { stripInlinePromptTokensForPresentation } from './contentTransforms'
import {
  exportPdfCurrentWebview,
  isDesktopRuntime,
  isMacDesktopRuntime,
  printCurrentWebview,
} from './desktopRuntime'
import { renderMarkdownToSafeHtml } from './markdown'

const PRINT_ROOT_ID = 'ghost-writer-print-root'
const PRINT_STYLE_ID = 'ghost-writer-print-style'
const PRINT_SECTION_CLASS = 'ghost-writer-print-section'
const SECTION_HEADING_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6'])
let desktopPrintInFlight = false

function buildPrintContentHtml({ bodyHtml }) {
  const sectionedBody = buildSectionAwarePrintBody(bodyHtml)
  return `<article class="ghost-writer-print-main" aria-label="Print content">${sectionedBody}</article>`
}

function buildSectionAwarePrintBody(bodyHtml = '') {
  if (!bodyHtml) return ''
  if (typeof document === 'undefined') return bodyHtml

  const container = document.createElement('div')
  container.innerHTML = bodyHtml
  const nodes = Array.from(container.childNodes)
  if (!nodes.length) return ''

  const sections = []
  let currentSection = createSectionElement()

  for (const node of nodes) {
    if (isSectionHeading(node) && hasMeaningfulChildNodes(currentSection)) {
      sections.push(currentSection)
      currentSection = createSectionElement()
    }
    currentSection.appendChild(node)
  }

  if (currentSection.childNodes.length > 0) {
    sections.push(currentSection)
  }

  return sections.map((section) => section.outerHTML).join('')
}

function createSectionElement() {
  const section = document.createElement('section')
  section.className = PRINT_SECTION_CLASS
  return section
}

function isSectionHeading(node) {
  return node?.nodeType === 1 && SECTION_HEADING_TAGS.has(node.tagName)
}

function hasMeaningfulChildNodes(section) {
  return Array.from(section.childNodes).some((child) => {
    if (child.nodeType === 3) {
      return Boolean(child.textContent?.trim())
    }
    return true
  })
}

function ensurePrintStyle() {
  const existing = document.getElementById(PRINT_STYLE_ID)
  if (existing) return existing

  const style = document.createElement('style')
  style.id = PRINT_STYLE_ID
  style.textContent = `
    @page {
      size: auto;
      margin: 0.5in 0.7in 1in 0.7in;
    }

    #${PRINT_ROOT_ID} {
      display: none;
    }

    .ghost-writer-print-main {
      width: 100%;
      margin: 0;
      padding: 0;
      overflow-wrap: anywhere;
      word-break: break-word;
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        "Helvetica Neue",
        Arial,
        sans-serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #111827 !important;
      background: #fff !important;
    }

    @media print {
      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        color: #111827 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        -webkit-text-size-adjust: 100%;
      }

      body > *:not(#${PRINT_ROOT_ID}):not(#${PRINT_STYLE_ID}) {
        display: none !important;
      }

      #${PRINT_ROOT_ID} {
        display: block !important;
        margin: 0 !important;
        padding: 0.08in 0 0.18in !important;
        box-sizing: border-box;
      }

      .ghost-writer-print-main,
      .ghost-writer-print-main * {
        max-width: 100% !important;
        box-sizing: border-box;
      }

      .ghost-writer-print-main {
        padding: 0 !important;
      }

      .ghost-writer-print-main h1,
      .ghost-writer-print-main h2,
      .ghost-writer-print-main h3,
      .ghost-writer-print-main h4,
      .ghost-writer-print-main h5,
      .ghost-writer-print-main h6,
      .ghost-writer-print-main blockquote,
      .ghost-writer-print-main figure,
      .ghost-writer-print-main pre,
      .ghost-writer-print-main table {
        page-break-inside: avoid;
        break-inside: avoid-page;
      }

      .ghost-writer-print-main h1,
      .ghost-writer-print-main h2,
      .ghost-writer-print-main h3,
      .ghost-writer-print-main h4,
      .ghost-writer-print-main h5,
      .ghost-writer-print-main h6,
      .ghost-writer-print-main blockquote {
        page-break-after: avoid;
        break-after: avoid-page;
      }

      .ghost-writer-print-main hr {
        page-break-after: avoid;
        break-after: avoid-page;
        margin: 1rem 0 !important;
      }

      .ghost-writer-print-main p,
      .ghost-writer-print-main li {
        orphans: 2;
        widows: 2;
      }

      .ghost-writer-print-section {
        page-break-inside: avoid;
        break-inside: avoid-page;
        page-break-after: avoid;
        break-after: avoid-page;
      }

      .ghost-writer-print-section + .ghost-writer-print-section {
        margin-top: 0.5rem;
      }
    }
  `

  document.head.appendChild(style)
  return style
}

function cleanupPrintNodes(rootNode, styleNode) {
  rootNode?.remove()
  styleNode?.remove()
}

function createDeferredCleanup(cleanup, fallbackDelayMs = 15000) {
  let didCleanup = false
  let timeoutId = null

  const cleanupOnce = () => {
    if (didCleanup) return
    didCleanup = true
    if (timeoutId != null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    cleanup()
  }

  if (typeof window.addEventListener === 'function') {
    window.addEventListener('afterprint', cleanupOnce, { once: true })
  }
  timeoutId = setTimeout(cleanupOnce, fallbackDelayMs)

  return cleanupOnce
}

function preparePrintDocument(markdown = '', showMdPrompts = false) {
  const preparedMarkdown = showMdPrompts
    ? markdown
    : stripInlinePromptTokensForPresentation(markdown)
  const bodyHtml = renderMarkdownToSafeHtml(preparedMarkdown)
  const styleNode = ensurePrintStyle()

  const rootNode = document.createElement('section')
  rootNode.id = PRINT_ROOT_ID
  rootNode.innerHTML = buildPrintContentHtml({ bodyHtml })
  document.body.appendChild(rootNode)

  const cleanup = () => {
    cleanupPrintNodes(rootNode, styleNode)
  }

  return {
    cleanup,
    preparedMarkdown,
    rootNode,
  }
}

// Renders markdown for print/export. If showMdPrompts is true, keep inline prompts in the
// rendered output; otherwise strip them for presentation.
export function printRenderedMarkdown(markdown = '', showMdPrompts = false) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  if (desktopPrintInFlight && isDesktopRuntime()) return false

  const { cleanup, rootNode } = preparePrintDocument(markdown, showMdPrompts)

  // Flush layout before printing so print CSS is fully applied.
  void rootNode.offsetHeight

  if (isDesktopRuntime() && isMacDesktopRuntime()) {
    desktopPrintInFlight = true
    const cleanupOnce = createDeferredCleanup(() => {
      cleanup()
      desktopPrintInFlight = false
    }, 120000)
    void (async () => {
      const opened = await printCurrentWebview()
      if (!opened && typeof window.print === 'function') {
        try {
          window.print()
        } catch {
          cleanupOnce()
        }
      }
    })()
    return true
  }

  const cleanupOnce = createDeferredCleanup(cleanup)

  if (typeof window.print !== 'function') {
    cleanupOnce()
    return false
  }

  try {
    window.print()
  } catch {
    cleanupOnce()
    return false
  }

  return true
}

export async function exportRenderedMarkdownAsPdf(markdown = '', showMdPrompts = false, suggestedName = 'untitled.pdf') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  if (!isDesktopRuntime()) return false

  if (isMacDesktopRuntime()) {
    return printRenderedMarkdown(markdown, showMdPrompts)
  }

  const { cleanup, rootNode } = preparePrintDocument(markdown, showMdPrompts)
  void rootNode.offsetHeight

  try {
    return await exportPdfCurrentWebview(suggestedName)
  } finally {
    cleanup()
  }
}
