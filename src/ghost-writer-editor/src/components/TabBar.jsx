function TabBar({ tabs, activeTabId, onSelectTab, onCreateTab, onCloseTab }) {
  return (
    <div className="tab-bar" role="tablist" aria-label="Document tabs">
      <div className="tab-bar__tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className={`tab-bar__tab${isActive ? ' tab-bar__tab--active' : ''}`}
              aria-selected={isActive}
              aria-label={`Switch to ${tab.title}`}
              onClick={() => onSelectTab(tab.id)}
            >
              <span className="tab-bar__label">{tab.title}</span>
              <span
                role="button"
                tabIndex={0}
                className="tab-bar__close"
                aria-label={`Close ${tab.title}`}
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
              </span>
            </button>
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
