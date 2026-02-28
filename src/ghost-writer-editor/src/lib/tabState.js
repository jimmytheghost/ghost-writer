const UNTITLED_TITLE = 'Untitled'
let tabIdCounter = 0

function createTabId() {
  tabIdCounter += 1
  return `tab-${Date.now()}-${tabIdCounter.toString(36)}`
}

export function createUntitledTitle(index) {
  if (index <= 1) return UNTITLED_TITLE
  return `${UNTITLED_TITLE} ${index}`
}

export function createNewTab(index) {
  return {
    id: createTabId(),
    title: createUntitledTitle(index),
    content: '',
    filePath: '',
    lastSavedContent: '',
    isDirty: false,
    promptText: '',
    promptError: '',
  }
}

export function replaceActiveTab(tabs, activeTabId, replacement) {
  return tabs.map((tab) => {
    if (tab.id !== activeTabId) return tab
    return typeof replacement === 'function' ? replacement(tab) : replacement
  })
}

export function updateTabContent(tabs, tabId, content) {
  return tabs.map((tab) => {
    if (tab.id !== tabId) return tab
    if (tab.content === content) return tab
    return {
      ...tab,
      content,
      isDirty: content !== (tab.lastSavedContent ?? ''),
    }
  })
}

export function renameActiveTab(tabs, activeTabId, title) {
  return tabs.map((tab) => (tab.id === activeTabId ? { ...tab, title } : tab))
}

export function closeTabById(tabs, tabId) {
  const closedIndex = tabs.findIndex((tab) => tab.id === tabId)
  if (closedIndex === -1) {
    return {
      tabs,
      closedIndex: -1,
    }
  }

  return {
    tabs: tabs.filter((tab) => tab.id !== tabId),
    closedIndex,
  }
}
