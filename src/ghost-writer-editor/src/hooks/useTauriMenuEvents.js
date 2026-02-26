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
      const listenerSpecs = [
        ['ghost-writer://menu-new', () => onNew()],
        ['ghost-writer://menu-open', () => onOpen()],
        ['ghost-writer://menu-duplicate', () => onDuplicate()],
        ['ghost-writer://menu-rename', () => onRename()],
        ['ghost-writer://menu-open-recent', (event) => onOpenRecent(event.payload)],
        ['ghost-writer://menu-open-recent-error', (event) => onOpenRecentError(event.payload)],
        ['ghost-writer://menu-save', () => onSave()],
        ['ghost-writer://menu-print', () => onPrint()],
        ['ghost-writer://menu-preview', () => onShowPreview()],
        ['ghost-writer://menu-text-edit', () => onShowTextEdit()],
        ['ghost-writer://menu-pin-top', () => onToggleAlwaysOnTop()],
        ['ghost-writer://menu-toggle-footer', () => onToggleFooter()],
        ['ghost-writer://menu-toggle-tab-bar', () => onToggleTabBar()],
        ['ghost-writer://menu-settings', () => onShowSettings()],
        ['ghost-writer://menu-word-list', () => onShowWordList()],
        ['ghost-writer://menu-text-zoom', () => onShowTextZoom()],
        ['ghost-writer://menu-export-copy-html', () => onExportCopyHtml()],
        ['ghost-writer://menu-export-copy-rich-text', () => onExportCopyRichText()],
        ['ghost-writer://menu-export-html', () => onExportHtml()],
        ['ghost-writer://menu-export-pdf', () => onExportPdf()],
        ['ghost-writer://menu-export-rtf', () => onExportRtf()],
        ['ghost-writer://menu-export-word', () => onExportWord()],
        ['ghost-writer://menu-export-latex', () => onExportLatex()],
        ['ghost-writer://menu-about', () => onShowAbout()],
      ]

      const results = await Promise.allSettled(
        listenerSpecs.map(([eventName, handler]) => listen(eventName, handler)),
      )

      const failedEventNames = []
      const successfulListeners = []

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulListeners.push(result.value)
          return
        }
        failedEventNames.push(listenerSpecs[index][0])
      })

      if (disposed) {
        successfulListeners.forEach((unlisten) => unlisten())
        return
      }

      unlistenFns.push(...successfulListeners)

      if (failedEventNames.length > 0) {
        console.warn(
          `Failed to register ${failedEventNames.length} Tauri menu listener(s): ${failedEventNames.join(', ')}`,
        )
      }
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
