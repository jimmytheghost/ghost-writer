import { useEffect } from 'react'

export function useGlobalShortcuts({
  saveActionRef,
  saveAsActionRef,
  openActionRef,
  newActionRef,
  closeActionRef,
  closeAllActionRef,
  printActionRef,
  onToggleAlwaysOnTop,
  onDuplicate,
  onTogglePreview,
  onToggleFooter,
  onToggleTabBar,
  onTogglePromptPanel,
  onShowFindReplace,
}) {
  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      const key = event.key.toLowerCase()
      const hasMod = event.metaKey || event.ctrlKey

      if (hasMod && !event.altKey && key === 's') {
        if (event.shiftKey) {
          event.preventDefault()
          saveAsActionRef.current?.()
          return
        }
        event.preventDefault()
        saveActionRef.current?.()
        return
      }

      if (hasMod && !event.altKey && key === 'o') {
        event.preventDefault()
        openActionRef.current?.()
        return
      }

      if (hasMod && !event.altKey && key === 'f') {
        event.preventDefault()
        onShowFindReplace()
        return
      }

      if (hasMod && !event.altKey && key === 'n') {
        event.preventDefault()
        newActionRef.current?.()
        return
      }

      if (hasMod && !event.altKey && key === 'w') {
        event.preventDefault()
        if (event.shiftKey) {
          closeAllActionRef.current?.()
          return
        }
        closeActionRef.current?.()
        return
      }

      if (hasMod && !event.altKey && key === 'p') {
        event.preventDefault()
        printActionRef.current?.()
        return
      }

      if (hasMod && !event.altKey && key === 't') {
        event.preventDefault()
        onToggleAlwaysOnTop()
        return
      }

      if (hasMod && event.shiftKey && !event.altKey && key === 'b') {
        event.preventDefault()
        onToggleFooter()
        return
      }

      if (hasMod && event.shiftKey && !event.altKey && key === 'h') {
        event.preventDefault()
        onToggleTabBar()
        return
      }

      if (hasMod && event.shiftKey && !event.altKey && key === 'd') {
        event.preventDefault()
        onDuplicate()
        return
      }

      if (hasMod && event.shiftKey && !event.altKey && key === 'i') {
        event.preventDefault()
        onTogglePromptPanel()
        return
      }

      if (!hasMod || event.altKey || key !== 'm') return

      event.preventDefault()
      onTogglePreview()
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [
    closeActionRef,
    closeAllActionRef,
    newActionRef,
    onDuplicate,
    onToggleAlwaysOnTop,
    onToggleFooter,
    onTogglePromptPanel,
    onToggleTabBar,
    onTogglePreview,
    onShowFindReplace,
    openActionRef,
    printActionRef,
    saveActionRef,
    saveAsActionRef,
  ])
}
