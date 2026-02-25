import { useEffect } from 'react'

export function useGlobalShortcuts({
  saveActionRef,
  openActionRef,
  newActionRef,
  closeActionRef,
  onToggleAlwaysOnTop,
  onTogglePreview,
  onToggleFooter,
}) {
  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      const key = event.key.toLowerCase()
      const hasMod = event.metaKey || event.ctrlKey

      if (hasMod && !event.altKey && key === 's') {
        event.preventDefault()
        saveActionRef.current?.()
        return
      }

      if (hasMod && !event.altKey && key === 'o') {
        event.preventDefault()
        openActionRef.current?.()
        return
      }

      if (hasMod && !event.altKey && key === 'n') {
        event.preventDefault()
        newActionRef.current?.()
        return
      }

      if (hasMod && !event.altKey && key === 'w') {
        event.preventDefault()
        closeActionRef.current?.()
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

      if (!hasMod || event.altKey || key !== 'm') return

      event.preventDefault()
      onTogglePreview()
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [closeActionRef, newActionRef, onToggleAlwaysOnTop, onToggleFooter, onTogglePreview, openActionRef, saveActionRef])
}
