import { useCallback, useEffect, useRef } from 'react'

function formatTabLabel(title = '') {
  const withoutExtension = title.replace(/\.md$/i, '').trim()
  return withoutExtension || title
}

function TabBar({ tabs, activeTabId, onSelectTab, onCreateTab, onCloseTab, onReorderTabs }) {
  const pointerDragRef = useRef(null)
  const isTrackingPointerRef = useRef(false)
  const stopPointerTrackingRef = useRef(() => {})
  const previousBodyUserSelectRef = useRef('')
  const previousBodyWebkitUserSelectRef = useRef('')

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

      const tabWidth = Math.max(dragState.estimatedTabWidth ?? 0, 1)
      const movedSlots = Math.round(deltaX / tabWidth)
      const targetIndex = Math.max(0, Math.min(tabs.length - 1, dragState.initialIndex + movedSlots))
      if (targetIndex === dragState.lastTargetIndex) return

      onReorderTabs?.(dragState.draggedTabId, targetIndex)
      dragState.lastTargetIndex = targetIndex
    },
    [onReorderTabs, tabs.length],
  )

  const handlePointerUp = useCallback(() => {
    pointerDragRef.current = null
    const bodyStyle = document.body?.style
    if (bodyStyle) {
      bodyStyle.userSelect = previousBodyUserSelectRef.current || ''
      bodyStyle.webkitUserSelect = previousBodyWebkitUserSelectRef.current || ''
    }
    stopPointerTrackingRef.current()
  }, [])

  const stopPointerTracking = useCallback(() => {
    if (!isTrackingPointerRef.current) return
    window.removeEventListener('mousemove', handlePointerMove)
    window.removeEventListener('mouseup', handlePointerUp)
    isTrackingPointerRef.current = false
  }, [handlePointerMove, handlePointerUp])

  useEffect(() => {
    stopPointerTrackingRef.current = stopPointerTracking
  }, [stopPointerTracking])

  useEffect(() => () => {
    stopPointerTrackingRef.current()
  }, [])

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
                stopPointerTrackingRef.current()
                const bodyStyle = document.body?.style
                if (bodyStyle) {
                  previousBodyUserSelectRef.current = bodyStyle.userSelect
                  previousBodyWebkitUserSelectRef.current = bodyStyle.webkitUserSelect
                  bodyStyle.userSelect = 'none'
                  bodyStyle.webkitUserSelect = 'none'
                }
                const tabWidth = event.currentTarget.getBoundingClientRect().width || 120
                const initialIndex = tabs.findIndex((candidate) => candidate.id === tab.id)
                pointerDragRef.current = {
                  draggedTabId: tab.id,
                  startX: event.clientX,
                  startY: event.clientY,
                  initialIndex: Math.max(0, initialIndex),
                  estimatedTabWidth: tabWidth,
                  hasHorizontalIntent: false,
                  lastTargetIndex: Math.max(0, initialIndex),
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
