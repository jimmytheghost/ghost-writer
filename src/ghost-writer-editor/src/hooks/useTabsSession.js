import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createNewTab,
  replaceActiveTab,
  updateTabContent,
} from '../lib/tabState'
import {
  loadSettings,
  loadMarkdownFilesByPaths,
  saveMarkdownToPath,
  saveSettings,
} from '../lib/desktopRuntime'
import {
  DEFAULT_SETTINGS,
  ensureMarkdownFileName,
  exceedsLoadFileSizeLimit,
  fileNameFromPath,
  readLegacyAlwaysOnTopSetting,
  stripExtension,
} from '../lib/appUtils'

/**
 * Tab and session state: tabs, selection/scroll/streaming by tab,
 * session restore/persist, auto-save. Caller provides setSettings,
 * applySettings, and settings (for persist/auto-save).
 */
export function useTabsSession({
  setSettings,
  applySettings,
  settings,
  isDesktopRuntime,
  onRequestEditorFocus,
}) {
  const initialTab = useMemo(() => createNewTab(1), [])

  const [tabs, setTabs] = useState(() => [initialTab])
  const [activeTabId, setActiveTabId] = useState(() => initialTab.id)
  const [nextUntitledIndex, setNextUntitledIndex] = useState(2)
  const [selectionRangesByTab, setSelectionRangesByTab] = useState(() => ({
    [initialTab.id]: { start: 0, end: 0 },
  }))
  const [scrollPositionsByTab, setScrollPositionsByTab] = useState(() => ({
    [initialTab.id]: { editorTop: 0, previewTop: 0 },
  }))
  const [streamingRangesByTab, setStreamingRangesByTab] = useState({})
  const [hasLoadedDesktopSettings, setHasLoadedDesktopSettings] = useState(
    () => !isDesktopRuntime(),
  )
  const lastPersistedSessionRef = useRef({ paths: [], activePath: '' })

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [tabs, activeTabId],
  )
  const activeContent = activeTab?.content ?? ''
  const selectionRange = selectionRangesByTab[activeTabId] ?? { start: 0, end: 0 }
  const activeStreamingRange = streamingRangesByTab[activeTabId] ?? null

  const shouldReplaceEmptyUntitledActiveTab = useMemo(() => {
    if (!activeTabId || !activeTab) return false
    const hasContent = (activeTab.content ?? '').trim().length > 0
    const isUntitled = /^Untitled(?:\s+\d+)?(?:\.md)?$/i.test((activeTab.title ?? '').trim())
    return !hasContent && !activeTab.isDirty && !activeTab.filePath && isUntitled
  }, [activeTab, activeTabId])

  const updateTabById = useCallback((tabId, updater) => {
    setTabs((currentTabs) =>
      currentTabs.map((tab) => {
        if (tab.id !== tabId) return tab
        return typeof updater === 'function' ? updater(tab) : updater
      }),
    )
  }, [])

  const setTabContentById = useCallback((tabId, content) => {
    setTabs((currentTabs) => updateTabContent(currentTabs, tabId, content))
  }, [])

  const getActiveTab = useCallback(() => {
    return tabs.find((tab) => tab.id === activeTabId) ?? null
  }, [tabs, activeTabId])

  const getTabById = useCallback(
    (tabId) => tabs.find((tab) => tab.id === tabId) ?? null,
    [tabs],
  )

  const setActiveSelectionRange = useCallback(
    (nextRange, shouldFocusEditor = false) => {
      if (!activeTabId) return
      setSelectionRangesByTab((currentRanges) => ({
        ...currentRanges,
        [activeTabId]: nextRange,
      }))
      if (shouldFocusEditor && onRequestEditorFocus) {
        onRequestEditorFocus()
      }
    },
    [activeTabId, onRequestEditorFocus],
  )

  const createAndActivateTab = useCallback(() => {
    const nextTab = createNewTab(nextUntitledIndex)
    setNextUntitledIndex((current) => current + 1)
    setTabs((currentTabs) => [...currentTabs, nextTab])
    setSelectionRangesByTab((currentRanges) => ({
      ...currentRanges,
      [nextTab.id]: { start: 0, end: 0 },
    }))
    setScrollPositionsByTab((currentPositions) => ({
      ...currentPositions,
      [nextTab.id]: { editorTop: 0, previewTop: 0 },
    }))
    setActiveTabId(nextTab.id)
    return nextTab
  }, [nextUntitledIndex])

  const handleNew = useCallback(() => {
    createAndActivateTab()
  }, [createAndActivateTab])

  const handleDuplicate = useCallback(
    (activeTab) => {
      if (!activeTab) return

      const baseDuplicateTab = createNewTab(nextUntitledIndex)
      const sourceTitle = stripExtension(activeTab.title || 'untitled').trim() || 'untitled'
      const duplicateTitle = ensureMarkdownFileName(`${sourceTitle} copy`)
      const duplicateContent = activeTab.content ?? ''
      const duplicateTab = {
        ...baseDuplicateTab,
        title: duplicateTitle,
        content: duplicateContent,
        filePath: '',
        lastSavedContent: '',
        isDirty: duplicateContent.trim().length > 0,
      }

      setTabs((currentTabs) => [...currentTabs, duplicateTab])
      setNextUntitledIndex((current) => current + 1)
      setActiveTabId(duplicateTab.id)
      setSelectionRangesByTab((currentRanges) => ({
        ...currentRanges,
        [duplicateTab.id]: { start: 0, end: 0 },
      }))
      setScrollPositionsByTab((currentPositions) => ({
        ...currentPositions,
        [duplicateTab.id]: {
          editorTop: scrollPositionsByTab[activeTab.id]?.editorTop ?? 0,
          previewTop: scrollPositionsByTab[activeTab.id]?.previewTop ?? 0,
        },
      }))
    },
    [nextUntitledIndex, scrollPositionsByTab],
  )

  const handleRename = useCallback(
    async (tabToRename, renameMarkdownFileWithNativeDialog) => {
      if (!activeTabId) return

      if (isDesktopRuntime() && tabToRename?.filePath) {
        const currentFileName = ensureMarkdownFileName(fileNameFromPath(tabToRename.filePath))
        const renamedPath = await renameMarkdownFileWithNativeDialog(
          tabToRename.filePath,
          currentFileName,
        )
        if (!renamedPath) return

        const renamedTitle = ensureMarkdownFileName(fileNameFromPath(renamedPath))
        setTabs((currentTabs) =>
          currentTabs.map((tab) => {
            if (tab.id !== activeTabId) return tab
            return { ...tab, title: renamedTitle, filePath: renamedPath }
          }),
        )
        return
      }

      const currentTitle = tabToRename?.title || 'untitled.md'
      const nextTitle = window.prompt('Rename document', currentTitle)
      if (typeof nextTitle !== 'string') return
      const safeTitle = ensureMarkdownFileName(nextTitle)
      setTabs((currentTabs) =>
        currentTabs.map((tab) => {
          if (tab.id !== activeTabId) return tab
          return { ...tab, title: safeTitle }
        }),
      )
    },
    [activeTabId, isDesktopRuntime],
  )

  const handleTabSelect = useCallback((tabId) => {
    setActiveTabId(tabId)
  }, [])

  // Desktop: load settings and restore session once
  useEffect(() => {
    if (!isDesktopRuntime()) return
    if (!setSettings || !applySettings) return

    let cancelled = false

    const loadDesktopSettings = async () => {
      const payload = await loadSettings()
      if (cancelled) return
      if (!payload?.settings) {
        setHasLoadedDesktopSettings(true)
        return
      }

      let nextSettings = {
        ...DEFAULT_SETTINGS,
        ...payload.settings,
      }

      if (!payload.hasFile) {
        const legacyAlwaysOnTop = readLegacyAlwaysOnTopSetting()
        if (legacyAlwaysOnTop != null) {
          nextSettings = { ...nextSettings, defaultAlwaysOnTop: legacyAlwaysOnTop }
          await saveSettings(nextSettings)
        }
      }

      setSettings(nextSettings)
      applySettings(nextSettings)
      lastPersistedSessionRef.current = {
        paths: Array.isArray(nextSettings.sessionSavedTabPaths)
          ? nextSettings.sessionSavedTabPaths
          : [],
        activePath: String(nextSettings.sessionActiveTabPath || ''),
      }

      const sessionSavedTabPaths = Array.isArray(nextSettings.sessionSavedTabPaths)
        ? nextSettings.sessionSavedTabPaths.filter(Boolean)
        : []
      if (sessionSavedTabPaths.length) {
        const restoredFiles = (await loadMarkdownFilesByPaths(sessionSavedTabPaths)).filter(
          (file) => !exceedsLoadFileSizeLimit(file?.content ?? ''),
        )
        if (cancelled) return
        if (restoredFiles.length) {
          let highestUntitledIndex = 1
          const restoredTabs = restoredFiles.map((file) => {
            const base = createNewTab(1)
            const title = ensureMarkdownFileName(fileNameFromPath(file.path))
            const untitledMatch = /^Untitled(?:\s+(\d+))?$/i.exec(title.replace(/\.md$/i, ''))
            if (untitledMatch) {
              const value = Number(untitledMatch[1] ?? '1')
              if (Number.isFinite(value))
                highestUntitledIndex = Math.max(highestUntitledIndex, value)
            }
            return {
              ...base,
              title,
              content: file.content,
              filePath: file.path,
              lastSavedContent: file.content,
              isDirty: false,
            }
          })

          setTabs(restoredTabs)
          setSelectionRangesByTab(
            restoredTabs.reduce((acc, tab) => {
              acc[tab.id] = { start: 0, end: 0 }
              return acc
            }, {}),
          )
          const restoredActivePath = (nextSettings.sessionActiveTabPath || '').trim()
          const restoredActiveTab =
            restoredTabs.find((tab) => tab.filePath === restoredActivePath) ?? restoredTabs[0]
          setActiveTabId(restoredActiveTab.id)
          setNextUntitledIndex(highestUntitledIndex + 1)
        }
      }

      setHasLoadedDesktopSettings(true)
    }

    void loadDesktopSettings()
    return () => {
      cancelled = true
    }
  }, [applySettings, isDesktopRuntime, setSettings])

  // Desktop: persist session when tabs or active tab change
  useEffect(() => {
    if (!isDesktopRuntime()) return
    if (!hasLoadedDesktopSettings) return
    if (!setSettings) return

    const sessionSavedTabPaths = tabs
      .map((tab) => tab.filePath?.trim() ?? '')
      .filter(Boolean)
    const activeTabPath = (tabs.find((tab) => tab.id === activeTabId)?.filePath ?? '').trim()
    const persistedPaths = Array.isArray(lastPersistedSessionRef.current.paths)
      ? lastPersistedSessionRef.current.paths
      : []
    const samePaths =
      persistedPaths.length === sessionSavedTabPaths.length &&
      persistedPaths.every((path, index) => path === sessionSavedTabPaths[index])
    const sameActivePath =
      (lastPersistedSessionRef.current.activePath || '').trim() === activeTabPath

    if (samePaths && sameActivePath) return

    lastPersistedSessionRef.current = { paths: sessionSavedTabPaths, activePath: activeTabPath }
    void saveSettings({
      ...settings,
      sessionSavedTabPaths,
      sessionActiveTabPath: activeTabPath,
    })
  }, [activeTabId, hasLoadedDesktopSettings, isDesktopRuntime, setSettings, settings, tabs])

  // Desktop: auto-save interval
  useEffect(() => {
    if (!isDesktopRuntime()) return undefined
    if (!settings?.autoSaveEnabled) return undefined

    const intervalSeconds = Math.min(
      3600,
      Math.max(5, Number.parseInt(String(settings.autoSaveIntervalSeconds ?? 60), 10) || 60),
    )
    const timerId = window.setInterval(() => {
      const tabToSave = tabs.find((tab) => tab.id === activeTabId)
      if (!tabToSave?.filePath) return
      if (!tabToSave.isDirty) return

      void saveMarkdownToPath(tabToSave.content ?? '', tabToSave.filePath).then((savedPath) => {
        if (!savedPath) return
        setTabs((currentTabs) =>
          replaceActiveTab(currentTabs, tabToSave.id, (tab) => ({
            ...tab,
            title: ensureMarkdownFileName(fileNameFromPath(savedPath)),
            filePath: savedPath,
            lastSavedContent: tab.content ?? '',
            isDirty: false,
          })),
        )
      })
    }, intervalSeconds * 1000)

    return () => window.clearInterval(timerId)
  }, [
    activeTabId,
    isDesktopRuntime,
    settings?.autoSaveEnabled,
    settings?.autoSaveIntervalSeconds,
    tabs,
  ])

  return {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    nextUntitledIndex,
    setNextUntitledIndex,
    selectionRangesByTab,
    setSelectionRangesByTab,
    scrollPositionsByTab,
    setScrollPositionsByTab,
    streamingRangesByTab,
    setStreamingRangesByTab,
    hasLoadedDesktopSettings,
    activeTab,
    activeContent,
    selectionRange,
    activeStreamingRange,
    shouldReplaceEmptyUntitledActiveTab,
    updateTabById,
    setTabContentById,
    getActiveTab,
    getTabById,
    setActiveSelectionRange,
    createAndActivateTab,
    handleNew,
    handleDuplicate,
    handleRename,
    handleTabSelect,
  }
}
