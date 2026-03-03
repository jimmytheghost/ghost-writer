import { stripInlinePromptTokensForPresentation } from './contentTransforms'
import { isDesktopRuntime, printCurrentWebview } from './desktopRuntime'
import { renderMarkdownToSafeHtml } from './markdown'

const PRINT_ROOT_ID = 'ghost-writer-print-root'
const PRINT_STYLE_ID = 'ghost-writer-print-style'
const NATIVE_PRINT_CLASS = 'ghost-writer-native-printing'
let desktopPrintInFlight = false

function buildPrintContentHtml({ bodyHtml }) {
  return `<article class="ghost-writer-print-main preview__content" aria-label="Print content">${bodyHtml}</article>`
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

    body.${NATIVE_PRINT_CLASS} {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      color: #111827 !important;
    }

    body.${NATIVE_PRINT_CLASS} > *:not(#${PRINT_ROOT_ID}):not(#${PRINT_STYLE_ID}) {
      display: none !important;
    }

    body.${NATIVE_PRINT_CLASS} #${PRINT_ROOT_ID} {
      display: block !important;
      margin: 0 !important;
      padding: 0.08in 0 0.18in !important;
      box-sizing: border-box;
    }

    .ghost-writer-print-main {
      width: 100%;
      margin: 0;
      padding: 0;
      overflow-wrap: anywhere;
      word-break: break-word;
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

// Renders markdown for print/export. If showMdPrompts is true, keep inline prompts in the
// rendered output; otherwise strip them for presentation.
export function printRenderedMarkdown(markdown = '', showMdPrompts = false) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  if (desktopPrintInFlight && isDesktopRuntime()) return false

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
    document.body.classList.remove(NATIVE_PRINT_CLASS)
    cleanupPrintNodes(rootNode, styleNode)
  }

  // Flush layout before printing so print CSS is fully applied.
  void rootNode.offsetHeight

  if (isDesktopRuntime()) {
    desktopPrintInFlight = true
    document.body.classList.add(NATIVE_PRINT_CLASS)
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
