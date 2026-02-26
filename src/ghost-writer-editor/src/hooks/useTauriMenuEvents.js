import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { isDesktopRuntime } from '../lib/desktopRuntime'

export function useTauriMenuEvents({
  onNew,
  onOpen,
  onDuplicate,
  onRename,
  onOpenRecent,
  onOpenRecentError,
  onSave,
  onPrint,
  onShowPreview,
  onShowTextEdit,
  onToggleAlwaysOnTop,
  onToggleFooter,
  onToggleTabBar,
  onShowSettings,
  onShowWordList,
  onShowTextZoom,
  onExportCopyHtml,
  onExportCopyRichText,
  onExportHtml,
  onExportPdf,
  onExportRtf,
  onExportWord,
  onExportLatex,
  onShowAbout,
}) {
  useEffect(() => {
    if (!isDesktopRuntime()) return undefined

    let disposed = false
    const unlistenFns = []

    const registerListeners = async () => {
      const listeners = await Promise.all([
        listen('ghost-writer://menu-new', () => onNew()),
        listen('ghost-writer://menu-open', () => onOpen()),
        listen('ghost-writer://menu-duplicate', () => onDuplicate()),
        listen('ghost-writer://menu-rename', () => onRename()),
        listen('ghost-writer://menu-open-recent', (event) => onOpenRecent(event.payload)),
        listen('ghost-writer://menu-open-recent-error', (event) => onOpenRecentError(event.payload)),
        listen('ghost-writer://menu-save', () => onSave()),
        listen('ghost-writer://menu-print', () => onPrint()),
        listen('ghost-writer://menu-preview', () => onShowPreview()),
        listen('ghost-writer://menu-text-edit', () => onShowTextEdit()),
        listen('ghost-writer://menu-pin-top', () => onToggleAlwaysOnTop()),
        listen('ghost-writer://menu-toggle-footer', () => onToggleFooter()),
        listen('ghost-writer://menu-toggle-tab-bar', () => onToggleTabBar()),
        listen('ghost-writer://menu-settings', () => onShowSettings()),
        listen('ghost-writer://menu-word-list', () => onShowWordList()),
        listen('ghost-writer://menu-text-zoom', () => onShowTextZoom()),
        listen('ghost-writer://menu-export-copy-html', () => onExportCopyHtml()),
        listen('ghost-writer://menu-export-copy-rich-text', () => onExportCopyRichText()),
        listen('ghost-writer://menu-export-html', () => onExportHtml()),
        listen('ghost-writer://menu-export-pdf', () => onExportPdf()),
        listen('ghost-writer://menu-export-rtf', () => onExportRtf()),
        listen('ghost-writer://menu-export-word', () => onExportWord()),
        listen('ghost-writer://menu-export-latex', () => onExportLatex()),
        listen('ghost-writer://menu-about', () => onShowAbout()),
      ])

      if (disposed) {
        listeners.forEach((unlisten) => unlisten())
        return
      }

      unlistenFns.push(...listeners)
    }

    void registerListeners()

    return () => {
      disposed = true
      unlistenFns.forEach((unlisten) => unlisten())
    }
  }, [
    onNew,
    onOpen,
    onDuplicate,
    onRename,
    onOpenRecent,
    onOpenRecentError,
    onPrint,
    onSave,
    onShowAbout,
    onShowTextEdit,
    onShowPreview,
    onShowSettings,
    onShowTextZoom,
    onShowWordList,
    onExportCopyHtml,
    onExportCopyRichText,
    onExportHtml,
    onExportPdf,
    onExportRtf,
    onExportWord,
    onExportLatex,
    onToggleAlwaysOnTop,
    onToggleFooter,
    onToggleTabBar,
  ])
}
