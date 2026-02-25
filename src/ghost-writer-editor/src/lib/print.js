import { stripInlinePromptTokensForPresentation } from './contentTransforms'
import { isDesktopRuntime, printCurrentWebview } from './desktopRuntime'
import { renderMarkdownToSafeHtml } from './markdown'

const PRINT_ROOT_ID = 'ghost-writer-print-root'
const PRINT_STYLE_ID = 'ghost-writer-print-style'
const NATIVE_PRINT_CLASS = 'ghost-writer-native-printing'

function buildPrintContentHtml({ bodyHtml }) {
  return `<article class="ghost-writer-print-main" aria-label="Print content">${bodyHtml}</article>`
}

function ensurePrintStyle() {
  const existing = document.getElementById(PRINT_STYLE_ID)
  if (existing) return existing

  const style = document.createElement('style')
  style.id = PRINT_STYLE_ID
  style.textContent = `
    @page {
      size: auto;
      margin: 1in;
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
      padding: 0 !important;
      box-sizing: border-box;
    }

    .ghost-writer-print-main {
      width: 100%;
      margin: 0;
      padding: 0;
      font-family: "Calibri", "Carlito", "Segoe UI", Arial, sans-serif;
      font-size: 10.75pt;
      line-height: 1.38;
      color: #1f2937;
      text-rendering: optimizeLegibility;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .ghost-writer-print-main > :first-child {
      margin-top: 0 !important;
    }

    .ghost-writer-print-main h1,
    .ghost-writer-print-main h2,
    .ghost-writer-print-main h3,
    .ghost-writer-print-main h4,
    .ghost-writer-print-main h5,
    .ghost-writer-print-main h6 {
      color: #111827;
      font-family: "Calibri", "Carlito", "Segoe UI", Arial, sans-serif;
      font-weight: 700;
      line-height: 1.24;
      margin-top: 1.05em;
      margin-bottom: 0.42em;
      break-after: avoid-page;
      break-inside: avoid-page;
    }

    .ghost-writer-print-main h1 {
      font-size: 18pt;
      margin-top: 0;
      margin-bottom: 0.5em;
    }

    .ghost-writer-print-main h2 {
      font-size: 14pt;
    }

    .ghost-writer-print-main h3 {
      font-size: 12.2pt;
    }

    .ghost-writer-print-main h4,
    .ghost-writer-print-main h5,
    .ghost-writer-print-main h6 {
      font-size: 11.3pt;
    }

    .ghost-writer-print-main p,
    .ghost-writer-print-main ul,
    .ghost-writer-print-main ol,
    .ghost-writer-print-main pre,
    .ghost-writer-print-main blockquote,
    .ghost-writer-print-main table,
    .ghost-writer-print-main dl,
    .ghost-writer-print-main hr {
      margin-top: 0;
      margin-bottom: 0.72em;
    }

    .ghost-writer-print-main p,
    .ghost-writer-print-main li {
      orphans: 3;
      widows: 3;
    }

    .ghost-writer-print-main ul,
    .ghost-writer-print-main ol {
      padding-left: 1.35em;
    }

    .ghost-writer-print-main li {
      margin-bottom: 0.16em;
    }

    .ghost-writer-print-main pre,
    .ghost-writer-print-main code {
      font-family: "Noto Sans Mono", "SFMono-Regular", monospace;
      font-size: 0.92em;
    }

    .ghost-writer-print-main pre {
      white-space: pre-wrap;
      word-break: break-word;
      padding: 0.64em 0.72em;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: #f9fafb;
      break-inside: avoid-page;
    }

    .ghost-writer-print-main blockquote {
      margin-left: 0;
      margin-right: 0;
      padding: 0.08em 0.88em;
      border-left: 2px solid #9ca3af;
      color: #374151;
      break-inside: avoid-page;
    }

    .ghost-writer-print-main hr {
      border: 0;
      border-top: 1px solid #d1d5db;
    }

    .ghost-writer-print-main table {
      border-collapse: collapse;
      width: 100%;
      table-layout: fixed;
      font-size: 0.95em;
      break-inside: avoid-page;
    }

    .ghost-writer-print-main th,
    .ghost-writer-print-main td {
      border: 1px solid #d1d5db;
      padding: 0.3em 0.42em;
      text-align: left;
      vertical-align: top;
    }

    .ghost-writer-print-main th {
      background: #f3f4f6;
      font-weight: 700;
    }

    .ghost-writer-print-main a {
      color: #1d4ed8;
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    .ghost-writer-print-main img {
      max-width: 100%;
      height: auto;
      break-inside: avoid-page;
    }

    .ghost-writer-print-main input[type='checkbox'] {
      width: 0.9em;
      height: 0.9em;
      margin-right: 0.34em;
      transform: translateY(0.02em);
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
        padding: 0 !important;
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

export function printRenderedMarkdown(markdown = '') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false

  const preparedMarkdown = stripInlinePromptTokensForPresentation(markdown)
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
    document.body.classList.add(NATIVE_PRINT_CLASS)
    void (async () => {
      const opened = await printCurrentWebview()
      if (!opened && typeof window.print === 'function') {
        try {
          window.print()
        } catch {
          // No-op: cleanup below always runs.
        }
      }
      cleanup()
    })()
    return true
  }

  if (typeof window.addEventListener === 'function') {
    window.addEventListener('afterprint', cleanup, { once: true })
  }

  if (typeof window.print !== 'function') {
    cleanup()
    return false
  }

  try {
    window.print()
  } catch {
    cleanup()
    return false
  }

  // Fallback cleanup for runtimes where `afterprint` does not fire.
  setTimeout(cleanup, 15000)

  return true
}
