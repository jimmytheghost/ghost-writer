import { useEffect, useEffectEvent } from 'react'
import { listen } from '@tauri-apps/api/event'
import { isDesktopRuntime, warnDesktopRuntime } from '../lib/desktopRuntime'

export function useTauriMenuEvents({
  onNew,
  onOpen,
  onClose,
  onCloseAll,
  onDuplicate,
  onRename,
  onOpenRecent,
  onOpenRecentError,
  onSave,
  onSaveAs,
  onPrint,
  onShowPreview,
  onShowTextEdit,
  onToggleAlwaysOnTop,
  onToggleFooter,
  onToggleTabBar,
  onTogglePromptPanel,
  onToggleColoredOutput,
  onShowSettings,
  onShowWordList,
  onShowTextZoom,
  onShowAutoSave,
  onShowSpellCheck,
  onExportCopyHtml,
  onExportCopyRichText,
  onExportHtml,
  onExportPdf,
  onExportRtf,
  onExportWord,
  onExportLatex,
  onExportDiagnostics,
  onShowAbout,
  onShowFindReplace,
  onToggleMdPrompts,
}) {
  const handleNew = useEffectEvent(() => onNew())
  const handleOpen = useEffectEvent(() => onOpen())
  const handleClose = useEffectEvent(() => onClose())
  const handleCloseAll = useEffectEvent(() => onCloseAll())
  const handleDuplicate = useEffectEvent(() => onDuplicate())
  const handleRename = useEffectEvent(() => onRename())
  const handleOpenRecent = useEffectEvent((event) => onOpenRecent(event.payload))
  const handleOpenRecentError = useEffectEvent((event) => onOpenRecentError(event.payload))
  const handleSave = useEffectEvent(() => onSave())
  const handleSaveAs = useEffectEvent(() => onSaveAs?.())
  const handlePrint = useEffectEvent(() => onPrint())
  const handleShowPreview = useEffectEvent(() => onShowPreview())
  const handleShowTextEdit = useEffectEvent(() => onShowTextEdit())
  const handleToggleAlwaysOnTop = useEffectEvent(() => onToggleAlwaysOnTop())
  const handleToggleFooter = useEffectEvent(() => onToggleFooter())
  const handleToggleTabBar = useEffectEvent(() => onToggleTabBar())
  const handleTogglePromptPanel = useEffectEvent(() => onTogglePromptPanel())
  const handleToggleMdPrompts = useEffectEvent(() => onToggleMdPrompts?.())
  const handleToggleColoredOutput = useEffectEvent(() => onToggleColoredOutput?.())
  const handleShowSettings = useEffectEvent(() => onShowSettings())
  const handleShowWordList = useEffectEvent(() => onShowWordList())
  const handleShowTextZoom = useEffectEvent(() => onShowTextZoom())
  const handleShowAutoSave = useEffectEvent(() => onShowAutoSave())
  const handleShowSpellCheck = useEffectEvent(() => onShowSpellCheck())
  const handleExportCopyHtml = useEffectEvent(() => onExportCopyHtml())
  const handleExportCopyRichText = useEffectEvent(() => onExportCopyRichText())
  const handleExportHtml = useEffectEvent(() => onExportHtml())
  const handleExportPdf = useEffectEvent(() => onExportPdf())
  const handleExportRtf = useEffectEvent(() => onExportRtf())
  const handleExportWord = useEffectEvent(() => onExportWord())
  const handleExportLatex = useEffectEvent(() => onExportLatex())
  const handleExportDiagnostics = useEffectEvent(() => onExportDiagnostics?.())
  const handleShowFindReplace = useEffectEvent(() => onShowFindReplace())
  const handleShowAbout = useEffectEvent(() => onShowAbout())

  useEffect(() => {
    if (!isDesktopRuntime()) return undefined

    let disposed = false
    const unlistenFns = []

    const registerListeners = async () => {
      const listenerSpecs = [
        ['ghost-writer://menu-new', handleNew],
        ['ghost-writer://menu-open', handleOpen],
        ['ghost-writer://menu-close', handleClose],
        ['ghost-writer://menu-close-all', handleCloseAll],
        ['ghost-writer://menu-duplicate', handleDuplicate],
        ['ghost-writer://menu-rename', handleRename],
        ['ghost-writer://menu-open-recent', handleOpenRecent],
        ['ghost-writer://menu-open-recent-error', handleOpenRecentError],
        ['ghost-writer://menu-save', handleSave],
        ['ghost-writer://menu-save-as', handleSaveAs],
        ['ghost-writer://menu-print', handlePrint],
        ['ghost-writer://menu-preview', handleShowPreview],
        ['ghost-writer://menu-text-edit', handleShowTextEdit],
        ['ghost-writer://menu-pin-top', handleToggleAlwaysOnTop],
        ['ghost-writer://menu-toggle-footer', handleToggleFooter],
        ['ghost-writer://menu-toggle-tab-bar', handleToggleTabBar],
        ['ghost-writer://menu-toggle-prompt-panel', handleTogglePromptPanel],
        // New: toggle showing Markdown inline prompts within the document
        ['ghost-writer://menu-toggle-md-prompts', handleToggleMdPrompts],
        ['ghost-writer://menu-toggle-colored-output', handleToggleColoredOutput],
        ['ghost-writer://menu-settings', handleShowSettings],
        ['ghost-writer://menu-word-list', handleShowWordList],
        ['ghost-writer://menu-text-zoom', handleShowTextZoom],
        ['ghost-writer://menu-auto-save', handleShowAutoSave],
        ['ghost-writer://menu-spell-check', handleShowSpellCheck],
        ['ghost-writer://menu-export-copy-html', handleExportCopyHtml],
        ['ghost-writer://menu-export-copy-rich-text', handleExportCopyRichText],
        ['ghost-writer://menu-export-html', handleExportHtml],
        ['ghost-writer://menu-export-pdf', handleExportPdf],
        ['ghost-writer://menu-export-rtf', handleExportRtf],
        ['ghost-writer://menu-export-word', handleExportWord],
        ['ghost-writer://menu-export-latex', handleExportLatex],
        ['ghost-writer://menu-export-diagnostics', handleExportDiagnostics],
        ['ghost-writer://menu-find-replace', handleShowFindReplace],
        ['ghost-writer://menu-about', handleShowAbout],
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
        warnDesktopRuntime(
          'desktop.menu.listeners.register_failed',
          `Failed to register ${failedEventNames.length} Tauri menu listener(s).`,
          failedEventNames.join(', '),
        )
      }
    }

    void registerListeners()

    return () => {
      disposed = true
      unlistenFns.forEach((unlisten) => unlisten())
    }
  }, [])
}
