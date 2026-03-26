import { useCallback, useEffect, useRef } from 'react'

function formatTabLabel(title = '') {
  const withoutExtension = title.replace(/\.md$/i, '').trim()
  return withoutExtension || title
}

function TabBar({ tabs, activeTabId, onSelectTab, onCreateTab, onCloseTab, onReorderTabs }) {
  const pointerDragRef = useRef(null)
  const isTrackingPointerRef = useRef(false)

  const stopPointerTracking = useCallback(() => {
    if (!isTrackingPointerRef.current) return
    window.removeEventListener('mousemove', handlePointerMove)
    window.removeEventListener('mouseup', handlePointerUp)
    isTrackingPointerRef.current = false
  }, [])

  const resetPointerDrag = useCallback(() => {
    pointerDragRef.current = null
    stopPointerTracking()
  }, [stopPointerTracking])

  const handlePointerMove = useCallback(
    (event) => {
      const dragState = pointerDragRef.current
      if (!dragState) return

      const deltaX = event.clientX - dragState.startX
      const deltaY = event.clientY - dragState.startY
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      if (!dragState.hasHorizontalIntent) {
        if (absX < 4 && absY < 4) return
        if (absX <= absY) return
        dragState.hasHorizontalIntent = true
      }

      const targetElement = document.elementFromPoint?.(event.clientX, event.clientY)
      if (!(targetElement instanceof Element)) return

      const targetTab = targetElement.closest('[data-tab-id]')
      const targetTabId = targetTab?.getAttribute('data-tab-id')
      if (!targetTabId || targetTabId === dragState.draggedTabId) return
      if (targetTabId === dragState.lastTargetTabId) return

      onReorderTabs?.(dragState.draggedTabId, targetTabId)
      dragState.lastTargetTabId = targetTabId
    },
    [onReorderTabs],
  )

  const handlePointerUp = useCallback(() => {
    resetPointerDrag()
  }, [resetPointerDrag])

  useEffect(() => () => {
    stopPointerTracking()
  }, [stopPointerTracking])

  return (
    <div className="tab-bar" role="tablist" aria-label="Document tabs">
      <div className="tab-bar__tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          const baseTitle = formatTabLabel(tab.title)
          const displayTitle = tab.isDirty ? `${baseTitle}*` : baseTitle

          return (
            <div
              key={tab.id}
              role="tab"
              className={`tab-bar__tab${isActive ? ' tab-bar__tab--active' : ''}`}
              aria-selected={isActive}
              aria-label={`Switch to ${displayTitle}`}
              tabIndex={0}
              data-tab-id={tab.id}
              onMouseDown={(event) => {
                if (event.button !== 0) return
                if (event.target instanceof Element && event.target.closest('.tab-bar__close')) return
                stopPointerTracking()
                pointerDragRef.current = {
                  draggedTabId: tab.id,
                  startX: event.clientX,
                  startY: event.clientY,
                  hasHorizontalIntent: false,
                  lastTargetTabId: null,
                }
                window.addEventListener('mousemove', handlePointerMove)
                window.addEventListener('mouseup', handlePointerUp)
                isTrackingPointerRef.current = true
              }}
              onClick={() => onSelectTab(tab.id)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                onSelectTab(tab.id)
              }}
            >
              <span className="tab-bar__label">{displayTitle}</span>
              <button
                type="button"
                className="tab-bar__close"
                aria-label={`Close ${displayTitle}`}
                title={`Close ${displayTitle}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onCloseTab(tab.id)
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  event.stopPropagation()
                  onCloseTab(tab.id)
                }}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
      <button type="button" className="tab-bar__add" aria-label="New tab" onClick={onCreateTab}>
        <span className="material-symbols-rounded" aria-hidden="true">
          add
        </span>
      </button>
    </div>
  )
}

export default TabBar
