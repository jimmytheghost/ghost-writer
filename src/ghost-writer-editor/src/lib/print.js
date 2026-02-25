import { stripInlinePromptTokensForPresentation } from './contentTransforms'
import { isDesktopRuntime, printCurrentWebview } from './desktopRuntime'
import { renderMarkdownToSafeHtml } from './markdown'

const PRINT_ROOT_ID = 'ghost-writer-print-root'
const PRINT_STYLE_ID = 'ghost-writer-print-style'

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildPrintContentHtml({ title, bodyHtml }) {
  return `<main class="ghost-writer-print-main" aria-label="Print content">
    <h1 class="ghost-writer-print-title">${escapeHtml(title)}</h1>
    ${bodyHtml}
  </main>`
}

function ensurePrintStyle() {
  const existing = document.getElementById(PRINT_STYLE_ID)
  if (existing) return existing

  const style = document.createElement('style')
  style.id = PRINT_STYLE_ID
  style.textContent = `
    #${PRINT_ROOT_ID} {
      display: none;
    }

    .ghost-writer-print-main {
      max-width: 8.5in;
      margin: 0 auto;
      font-family: "Noto Sans", "Segoe UI", sans-serif;
      line-height: 1.5;
      color: #0f172a;
      font-size: 12pt;
    }

    .ghost-writer-print-title {
      font-size: 22px;
      margin: 0 0 0.6em;
      line-height: 1.2;
      font-weight: 700;
      color: #0f172a;
    }

    .ghost-writer-print-main pre,
    .ghost-writer-print-main code {
      font-family: "Noto Sans Mono", "SFMono-Regular", monospace;
    }

    .ghost-writer-print-main pre {
      white-space: pre-wrap;
      word-break: break-word;
      padding: 0.6em;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #f8fafc;
    }

    .ghost-writer-print-main table {
      border-collapse: collapse;
      width: 100%;
    }

    .ghost-writer-print-main th,
    .ghost-writer-print-main td {
      border: 1px solid #cbd5e1;
      padding: 0.35em 0.45em;
      text-align: left;
      vertical-align: top;
    }

    .ghost-writer-print-main a {
      color: #1d4ed8;
      text-decoration: underline;
    }

    @media print {
      body > *:not(#${PRINT_ROOT_ID}):not(#${PRINT_STYLE_ID}) {
        display: none !important;
      }

      #${PRINT_ROOT_ID} {
        display: block !important;
        padding: 0.75in;
      }

      @page {
        margin: 0.75in;
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

export function printRenderedMarkdown(markdown = '', { title = 'Ghost Writer Document' } = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false

  const preparedMarkdown = stripInlinePromptTokensForPresentation(markdown)
  const bodyHtml = renderMarkdownToSafeHtml(preparedMarkdown)
  const styleNode = ensurePrintStyle()

  const rootNode = document.createElement('section')
  rootNode.id = PRINT_ROOT_ID
  rootNode.innerHTML = buildPrintContentHtml({ title, bodyHtml })
  document.body.appendChild(rootNode)

  const cleanup = () => cleanupPrintNodes(rootNode, styleNode)

  if (typeof window.addEventListener === 'function') {
    window.addEventListener('afterprint', cleanup, { once: true })
  }

  setTimeout(() => {
    const triggerPrint = async () => {
      if (isDesktopRuntime()) {
        const didOpenNativeDialog = await printCurrentWebview()
        if (!didOpenNativeDialog) {
          window.print()
        }
        return
      }

      window.print()
    }

    void triggerPrint().finally(() => {
      setTimeout(cleanup, 1000)
    })
  }, 10)

  return true
}
