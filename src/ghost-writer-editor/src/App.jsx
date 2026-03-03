import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import bundledModelSnapshot from './generated/ollama-models.json'
import AppModals from './components/AppModals'
import Editor from './components/Editor'
import FooterBar from './components/FooterBar'
import PromptPanel from './components/PromptPanel'
import TabBar from './components/TabBar'
import { useDesktopAppMetadata } from './hooks/useDesktopAppMetadata'
import { useFooterHeightSync } from './hooks/useFooterHeightSync'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { useModelLoader } from './hooks/useModelLoader'
import { usePromptGeneration } from './hooks/usePromptGeneration'
import { useTauriMenuEvents } from './hooks/useTauriMenuEvents'
import {
  collectCheckboxLineIndexes,
  normalizeCustomCheckboxLines,
  stripInlinePromptTokensForPresentation,
  toggleCheckboxOnLine,
} from './lib/contentTransforms'
import {
  ensureOllamaRunning,
  exportDiagnosticsBundle,
  isDesktopRuntime,
  isMacDesktopRuntime,
  loadSettings,
  loadMarkdownFilesByPaths,
  markRendererInteractive,
  openMarkdownWithNativeDialog,
  openExternalUrl,
  renameMarkdownFileWithNativeDialog,
  saveMarkdownToPath,
  saveMarkdownWithNativeDialog,
  saveTextFileWithNativeDialog,
  saveSettings,
  setAlwaysOnTop,
} from './lib/desktopRuntime'
import { isSafeMarkdownUrl, renderMarkdownToSafeHtml } from './lib/markdown'
import { printRenderedMarkdown } from './lib/print'
import { getMisspelledWordCounts, preloadSpellcheck, setCustomSpellcheckWords } from './lib/spellcheck'
import {
  closeTabById,
  createNewTab,
  replaceActiveTab,
  updateTabContent,
} from './lib/tabState'
import {
  ALWAYS_ON_TOP_STORAGE_KEY,
  DEFAULT_SETTINGS,
  FILE_TOO_LARGE_MESSAGE,
  MAX_LOAD_FILE_SIZE_BYTES,
  TEXT_ZOOM_OPTIONS,
  ensureMarkdownFileName,
  escapeHtml,
  escapeLatex,
  escapeRtf,
  exceedsLoadFileSizeLimit,
  fileNameFromPath,
  normalizeTextZoom,
  readInitialAlwaysOnTop,
  readLegacyAlwaysOnTopSetting,
  resolveEnabledCustomWords,
  stripExtension,
} from './lib/appUtils'

const BUNDLED_MODELS = Array.isArray(bundledModelSnapshot?.models)
  ? bundledModelSnapshot.models.filter(Boolean)
  : []

function App() {
  const initialTab = useMemo(() => createNewTab(1), [])

  const [theme, setTheme] = useState('dark')
  const [tabs, setTabs] = useState(() => [initialTab])
  const [activeTabId, setActiveTabId] = useState(() => initialTab.id)
  const [nextUntitledIndex, setNextUntitledIndex] = useState(2)
  const [selectionRangesByTab, setSelectionRangesByTab] = useState(() => ({
    [initialTab.id]: { start: 0, end: 0 },
  }))
  const [scrollPositionsByTab, setScrollPositionsByTab] = useState(() => ({
    [initialTab.id]: { editorTop: 0, previewTop: 0 },
  }))
  const [isFooterCollapsed, setIsFooterCollapsed] = useState(true)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isWordListOpen, setIsWordListOpen] = useState(false)
  const [isTextZoomOpen, setIsTextZoomOpen] = useState(false)
  const [isSpellCheckScanOpen, setIsSpellCheckScanOpen] = useState(false)
  const [spellCheckScanStatus, setSpellCheckScanStatus] = useState('')
  const [spellCheckScanItems, setSpellCheckScanItems] = useState([])
  const [spellCheckScanTotal, setSpellCheckScanTotal] = useState(0)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [appName, setAppName] = useState('Ghost Writer')
  const [appVersion, setAppVersion] = useState('0.1.0')
  const [isPromptFocused, setIsPromptFocused] = useState(false)
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(() => readInitialAlwaysOnTop())
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isPromptPanelHidden, setIsPromptPanelHidden] = useState(false)
  // New: whether inline MD prompts ({{...}}) are visible in the Markdown preview
  const [isMdPromptsVisible, setIsMdPromptsVisible] = useState(false)
  const [isTabBarVisible, setIsTabBarVisible] = useState(true)
  const [isSpellCheckEnabled, setIsSpellCheckEnabled] = useState(DEFAULT_SETTINGS.defaultSpellCheck)
  const [spellcheckRefreshKey, setSpellcheckRefreshKey] = useState(0)
  const [editorTextZoomPercent, setEditorTextZoomPercent] = useState(() =>
    normalizeTextZoom(DEFAULT_SETTINGS.defaultTextZoom),
  )
  const [hasLoadedDesktopSettings, setHasLoadedDesktopSettings] = useState(() => !isDesktopRuntime())
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false)
  const [findQuery, setFindQuery] = useState('')
  const [replaceQuery, setReplaceQuery] = useState('')
  const [isFindCaseSensitive, setIsFindCaseSensitive] = useState(false)
  const [findStatusMessage, setFindStatusMessage] = useState('')
  const [editorFocusRequestId, setEditorFocusRequestId] = useState(0)
  const [streamingRangesByTab, setStreamingRangesByTab] = useState({})
  const [isColoredStreamingOutputEnabled, setIsColoredStreamingOutputEnabled] = useState(true)

  const isDark = theme === 'dark'
  const showDragRegion = isMacDesktopRuntime()
  const modKeyLabel = showDragRegion ? 'Cmd' : 'Ctrl'

  const fileInputRef = useRef(null)
  const promptFormRef = useRef(null)
  const saveActionRef = useRef(() => {})
  const saveAsActionRef = useRef(() => {})
  const openActionRef = useRef(() => {})
  const newActionRef = useRef(() => {})
  const closeActionRef = useRef(() => {})
  const closeAllActionRef = useRef(() => {})
  const printActionRef = useRef(() => {})
  const appRef = useRef(null)
  const footerRef = useRef(null)
  const previewContentRef = useRef(null)
  const findInputRef = useRef(null)
  const lastPersistedSessionRef = useRef({ paths: [], activePath: '' })

  const escapeFindQueryForRegex = useCallback((query) => {
    return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }, [])

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [tabs, activeTabId])
  const selectionRange = selectionRangesByTab[activeTabId] ?? { start: 0, end: 0 }
  const activeStreamingRange = streamingRangesByTab[activeTabId] ?? null
  const activeContent = activeTab?.content ?? ''
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

  const findMatchRanges = useCallback(
    (content, query) => {
      if (!query) return []
      const normalizedQuery = query.trim()
      if (!normalizedQuery) return []

      const escapedQuery = escapeFindQueryForRegex(normalizedQuery)
      const whitespaceFlexiblePattern = escapedQuery.replace(/\s+/g, '\\s+')
      const flags = isFindCaseSensitive ? 'g' : 'gi'
      const regex = new RegExp(whitespaceFlexiblePattern, flags)

      const ranges = []
      let match = regex.exec(content)
      while (match) {
        const start = match.index ?? -1
        const matchedText = match[0] ?? ''
        if (start < 0 || !matchedText.length) break
        ranges.push({ start, end: start + matchedText.length })
        match = regex.exec(content)
      }
      return ranges
    },
    [escapeFindQueryForRegex, isFindCaseSensitive],
  )

  const findMatches = useMemo(
    () => findMatchRanges(activeContent, findQuery),
    [activeContent, findMatchRanges, findQuery],
  )
  const activeSelectionStart = Math.min(selectionRange.start, selectionRange.end)
  const activeSelectionEnd = Math.max(selectionRange.start, selectionRange.end)
  const currentFindMatchIndex = useMemo(
    () =>
      findMatches.findIndex(
        (match) => match.start === activeSelectionStart && match.end === activeSelectionEnd,
      ),
    [activeSelectionEnd, activeSelectionStart, findMatches],
  )
  const findStatusDisplay =
    findStatusMessage ||
    (findQuery
      ? `${currentFindMatchIndex >= 0 ? currentFindMatchIndex + 1 : 0} of ${findMatches.length} match${findMatches.length === 1 ? '' : 'es'}`
      : '')

  const setActiveSelectionRange = useCallback(
    (nextRange, shouldFocusEditor = false) => {
      if (!activeTabId) return
      setSelectionRangesByTab((currentRanges) => ({
        ...currentRanges,
        [activeTabId]: nextRange,
      }))
      if (shouldFocusEditor) {
        setEditorFocusRequestId((current) => current + 1)
      }
    },
    [activeTabId],
  )

  const jumpToFindMatch = useCallback(
    (direction = 1) => {
      if (!findQuery) {
        setFindStatusMessage('Enter text to find.')
        return
      }

      const matches = findMatchRanges(activeContent, findQuery)
      if (!matches.length) {
        setFindStatusMessage('No matches found.')
        return
      }

      let targetMatch = null
      if (currentFindMatchIndex >= 0) {
        const offset = direction >= 0 ? 1 : -1
        const wrappedIndex =
          (currentFindMatchIndex + offset + matches.length) % matches.length
        targetMatch = matches[wrappedIndex]
      } else if (direction >= 0) {
        targetMatch = matches.find((match) => match.start >= activeSelectionEnd) ?? matches[0]
      } else {
        targetMatch =
          [...matches].reverse().find((match) => match.end <= activeSelectionStart) ??
          matches[matches.length - 1]
      }

      if (!targetMatch) return
      setActiveSelectionRange(targetMatch, true)
      setFindStatusMessage('')
    },
    [
      activeContent,
      activeSelectionEnd,
      activeSelectionStart,
      currentFindMatchIndex,
      findMatchRanges,
      findQuery,
      setActiveSelectionRange,
    ],
  )

  const handleReplaceOne = useCallback(() => {
    if (!activeTabId) return
    if (!findQuery) {
      setFindStatusMessage('Enter text to find.')
      return
    }

    const matches = findMatchRanges(activeContent, findQuery)
    if (!matches.length) {
      setFindStatusMessage('No matches found.')
      return
    }

    const selectedMatch =
      matches.find((match) => match.start === activeSelectionStart && match.end === activeSelectionEnd) ??
      matches.find((match) => match.start >= activeSelectionStart) ??
      matches[0]
    if (!selectedMatch) return

    const nextContent =
      `${activeContent.slice(0, selectedMatch.start)}${replaceQuery}${activeContent.slice(selectedMatch.end)}`
    setTabContentById(activeTabId, nextContent)

    const nextMatches = findMatchRanges(nextContent, findQuery)
    if (!nextMatches.length) {
      const collapsed = selectedMatch.start + replaceQuery.length
      setActiveSelectionRange({ start: collapsed, end: collapsed }, true)
      setFindStatusMessage('Replaced 1 match. No more matches found.')
      return
    }

    const nextStart = selectedMatch.start + replaceQuery.length
    const nextSelection = nextMatches.find((match) => match.start >= nextStart) ?? nextMatches[0]
    setActiveSelectionRange(nextSelection, true)
    setFindStatusMessage('Replaced 1 match.')
  }, [
    activeContent,
    activeSelectionEnd,
    activeSelectionStart,
    activeTabId,
    findMatchRanges,
    findQuery,
    replaceQuery,
    setActiveSelectionRange,
    setTabContentById,
  ])

  const handleReplaceAll = useCallback(() => {
    if (!activeTabId) return
    if (!findQuery) {
      setFindStatusMessage('Enter text to find.')
      return
    }

    const matches = findMatchRanges(activeContent, findQuery)
    if (!matches.length) {
      setFindStatusMessage('No matches found.')
      return
    }

    let cursor = 0
    let result = ''
    matches.forEach((match) => {
      result += activeContent.slice(cursor, match.start)
      result += replaceQuery
      cursor = match.end
    })
    result += activeContent.slice(cursor)

    setTabContentById(activeTabId, result)
    const endPosition = Math.max(0, result.length)
    setActiveSelectionRange({ start: endPosition, end: endPosition }, true)
    setFindStatusMessage(`Replaced ${matches.length} match${matches.length === 1 ? '' : 'es'}.`)
  }, [
    activeContent,
    activeTabId,
    findMatchRanges,
    findQuery,
    replaceQuery,
    setActiveSelectionRange,
    setTabContentById,
  ])

  const { models, selectedModel, setSelectedModel, isLoadingModels, modelLoadStatus, loadModels } =
    useModelLoader({ bundledModels: BUNDLED_MODELS })

  const getActiveTab = useCallback(() => {
    return tabs.find((tab) => tab.id === activeTabId) ?? null
  }, [tabs, activeTabId])

  const getTabById = useCallback(
    (tabId) => {
      return tabs.find((tab) => tab.id === tabId) ?? null
    },
    [tabs],
  )

  const {
    abortGeneration,
    canRedoGeneration,
    canSubmitPrompt,
    canUndoGeneration,
    handleClearPrompt,
    handlePromptKeyDown,
    handlePromptSubmit,
    handlePrimaryPromptAction,
    handleUndoToggle,
    isLoadingPrompt,
    promptError,
    promptText,
    resetGenerationState,
    setPromptError,
    setPromptText,
    showStoppedToast,
    undoToggleState,
  } = usePromptGeneration({
    activeTabId,
    getActiveTab,
    getTabById,
    onStreamingRangeChange: ({ tabId, start, end, isActive, isFading = false }) => {
      if (!tabId) return
      setStreamingRangesByTab((current) => {
        if ((!isActive && !isFading) || end <= start) {
          if (!(tabId in current)) return current
          const next = { ...current }
          delete next[tabId]
          return next
        }

        const nextRange = {
          start: Math.max(0, start),
          end: Math.max(0, end),
          isActive: Boolean(isActive),
          isFading: Boolean(isFading),
        }
        const previousRange = current[tabId]
        if (
          previousRange &&
          previousRange.start === nextRange.start &&
          previousRange.end === nextRange.end &&
          previousRange.isActive === nextRange.isActive &&
          Boolean(previousRange.isFading) === nextRange.isFading
        ) {
          return current
        }

        return {
          ...current,
          [tabId]: nextRange,
        }
      })
    },
    selectedModel,
    selectionRange,
    setTabContentById,
    updateTabById,
    promptFormRef,
  })

  const checkboxLineIndexes = useMemo(
    () => (isPreviewOpen ? collectCheckboxLineIndexes(activeContent) : []),
    [activeContent, isPreviewOpen],
  )
  // Determine markdown used for the preview, honoring Hide/View MD Prompts setting
  const rawMdForPreview = isMdPromptsVisible ? activeContent : stripInlinePromptTokensForPresentation(activeContent)
  const normalizedPreviewMarkdown = useMemo(
    () => (isPreviewOpen ? normalizeCustomCheckboxLines(rawMdForPreview) : ''),
    [rawMdForPreview, isPreviewOpen],
  )
  const renderedMarkdown = useMemo(
    () => (isPreviewOpen ? renderMarkdownToSafeHtml(normalizedPreviewMarkdown) : ''),
    [isPreviewOpen, normalizedPreviewMarkdown],
  )

  useFooterHeightSync(appRef, footerRef, isFooterCollapsed ? 'collapsed' : 'expanded')

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      markRendererInteractive({ source: 'app-mounted' })
    })
    return () => cancelAnimationFrame(frameId)
  }, [])

  useEffect(() => {
    if (!isDesktopRuntime()) return
    let cancelled = false
    ensureOllamaRunning().then((result) => {
      if (cancelled || result.ok) return
      setPromptError(result.error ?? 'Ollama could not be started.')
    })
    return () => {
      cancelled = true
    }
  }, [setPromptError])

  useDesktopAppMetadata({ setAppName, setAppVersion })

  const applySettings = useCallback((nextSettings) => {
    setTheme(nextSettings.defaultTheme === 'light' ? 'light' : 'dark')
    setEditorTextZoomPercent(normalizeTextZoom(nextSettings.defaultTextZoom))
    setIsAlwaysOnTop(Boolean(nextSettings.defaultAlwaysOnTop))
    setIsFooterCollapsed(Boolean(nextSettings.defaultFooterCollapsed))
    setIsPreviewOpen(Boolean(nextSettings.defaultStartupPreview))
    setIsSpellCheckEnabled(Boolean(nextSettings.defaultSpellCheck))
    const customWordList = Array.isArray(nextSettings.customWordList)
      ? nextSettings.customWordList
      : DEFAULT_SETTINGS.customWordList
    const customWordListDisabled = Array.isArray(nextSettings.customWordListDisabled)
      ? nextSettings.customWordListDisabled
      : DEFAULT_SETTINGS.customWordListDisabled
    setCustomSpellcheckWords(resolveEnabledCustomWords(customWordList, customWordListDisabled))
    if (nextSettings.defaultModel) {
      setSelectedModel(nextSettings.defaultModel)
    }
    if (typeof nextSettings.defaultShowMdPrompts !== 'undefined') {
      setIsMdPromptsVisible(Boolean(nextSettings.defaultShowMdPrompts))
    }
  }, [setSelectedModel])

  // Toggle for showing/hiding MD prompts in preview/exports
  const handleToggleMdPrompts = useCallback(() => {
    setIsMdPromptsVisible((prev) => !prev)
  }, [])

  useEffect(() => {
    if (!isDesktopRuntime()) return

    const loadDesktopSettings = async () => {
      const payload = await loadSettings()
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
          nextSettings = {
            ...nextSettings,
            defaultAlwaysOnTop: legacyAlwaysOnTop,
          }
          await saveSettings(nextSettings)
        }
      }

      setSettings(nextSettings)
      applySettings(nextSettings)
      lastPersistedSessionRef.current = {
        paths: Array.isArray(nextSettings.sessionSavedTabPaths) ? nextSettings.sessionSavedTabPaths : [],
        activePath: String(nextSettings.sessionActiveTabPath || ''),
      }

      const sessionSavedTabPaths = Array.isArray(nextSettings.sessionSavedTabPaths)
        ? nextSettings.sessionSavedTabPaths.filter(Boolean)
        : []
      if (sessionSavedTabPaths.length) {
        const restoredFiles = (await loadMarkdownFilesByPaths(sessionSavedTabPaths)).filter(
          (file) => !exceedsLoadFileSizeLimit(file?.content ?? ''),
        )
        if (restoredFiles.length) {
          let highestUntitledIndex = 1
          const restoredTabs = restoredFiles.map((file) => {
            const base = createNewTab(1)
            const title = ensureMarkdownFileName(fileNameFromPath(file.path))
            const untitledMatch = /^Untitled(?:\s+(\d+))?$/i.exec(title.replace(/\.md$/i, ''))
            if (untitledMatch) {
              const value = Number(untitledMatch[1] ?? '1')
              if (Number.isFinite(value)) highestUntitledIndex = Math.max(highestUntitledIndex, value)
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
  }, [applySettings])

  useEffect(() => {
    if (!isDesktopRuntime()) return
    if (!hasLoadedDesktopSettings) return

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
    const sameActivePath = (lastPersistedSessionRef.current.activePath || '').trim() === activeTabPath

    if (samePaths && sameActivePath) return

    lastPersistedSessionRef.current = {
      paths: sessionSavedTabPaths,
      activePath: activeTabPath,
    }

    void saveSettings({
      ...settings,
      sessionSavedTabPaths,
      sessionActiveTabPath: activeTabPath,
    })
  }, [activeTabId, hasLoadedDesktopSettings, settings, tabs])

  useEffect(() => {
    if (!isDesktopRuntime()) return undefined
    if (!settings.autoSaveEnabled) return undefined

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

    return () => {
      window.clearInterval(timerId)
    }
  }, [activeTabId, settings.autoSaveEnabled, settings.autoSaveIntervalSeconds, tabs])

  useEffect(() => {
    if (!settings.defaultModel || !models.length) return
    if (models.includes(settings.defaultModel)) {
      setSelectedModel(settings.defaultModel)
    }
  }, [models, setSelectedModel, settings.defaultModel])

  useEffect(() => {
    void setAlwaysOnTop(isAlwaysOnTop)
  }, [isAlwaysOnTop])

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

  const handleDuplicate = useCallback(() => {
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
        editorTop: currentPositions[activeTab.id]?.editorTop ?? 0,
        previewTop: currentPositions[activeTab.id]?.previewTop ?? 0,
      },
    }))
  }, [activeTab, nextUntitledIndex])

  const handleRename = useCallback(async () => {
    if (!activeTabId) return

    if (isDesktopRuntime() && activeTab?.filePath) {
      const currentFileName = ensureMarkdownFileName(fileNameFromPath(activeTab.filePath))
      const renamedPath = await renameMarkdownFileWithNativeDialog(activeTab.filePath, currentFileName)
      if (!renamedPath) return

      const renamedTitle = ensureMarkdownFileName(fileNameFromPath(renamedPath))
      setTabs((currentTabs) =>
        currentTabs.map((tab) => {
          if (tab.id !== activeTabId) return tab
          return {
            ...tab,
            title: renamedTitle,
            filePath: renamedPath,
          }
        }),
      )
      return
    }

    const currentTitle = activeTab?.title || 'untitled.md'
    const nextTitle = window.prompt('Rename document', currentTitle)
    if (typeof nextTitle !== 'string') return
    const safeTitle = ensureMarkdownFileName(nextTitle)
    setTabs((currentTabs) =>
      currentTabs.map((tab) => {
        if (tab.id !== activeTabId) return tab
        return {
          ...tab,
          title: safeTitle,
        }
      }),
    )
  }, [activeTab, activeTabId])

  const handleTabSelect = useCallback((tabId) => {
    setActiveTabId(tabId)
  }, [])

  const handleCloseTab = useCallback(
    async (tabId) => {
      const tabToClose = tabs.find((tab) => tab.id === tabId)
      if (!tabToClose) return

      const hasContent = tabToClose.content.trim().length > 0
      const shouldPromptToSave = hasContent && tabToClose.isDirty
      if (shouldPromptToSave && isDesktopRuntime()) {
        const suggestedName = ensureMarkdownFileName(tabToClose.title || 'untitled')
        // Save dialog is shown for non-empty tabs; cancel still closes per product request.
        await saveMarkdownWithNativeDialog(tabToClose.content, suggestedName)
      }

      if (isLoadingPrompt && tabId === activeTabId) {
        abortGeneration()
      }

      const { tabs: remainingTabs, closedIndex } = closeTabById(tabs, tabId)
      setSelectionRangesByTab((currentRanges) => {
        const nextRanges = { ...currentRanges }
        delete nextRanges[tabId]
        return nextRanges
      })
      setScrollPositionsByTab((currentPositions) => {
        const nextPositions = { ...currentPositions }
        delete nextPositions[tabId]
        return nextPositions
      })

      if (remainingTabs.length === 0) {
        const replacementTab = createNewTab(nextUntitledIndex)
        setNextUntitledIndex((current) => current + 1)
        setTabs([replacementTab])
        setSelectionRangesByTab({
          [replacementTab.id]: { start: 0, end: 0 },
        })
        setScrollPositionsByTab({
          [replacementTab.id]: { editorTop: 0, previewTop: 0 },
        })
        setActiveTabId(replacementTab.id)
        setIsPreviewOpen(false)
        return
      }

      setTabs(remainingTabs)
      if (tabId === activeTabId) {
        const nextActiveTab =
          remainingTabs[closedIndex] ?? remainingTabs[closedIndex - 1] ?? remainingTabs[0]
        setActiveTabId(nextActiveTab.id)
      }
    },
    [abortGeneration, activeTabId, isLoadingPrompt, nextUntitledIndex, tabs],
  )

  const handleCloseAllTabs = useCallback(async () => {
    if (!tabs.length) return

    if (isLoadingPrompt) {
      abortGeneration()
    }

    if (isDesktopRuntime()) {
      for (const tab of tabs) {
        const hasContent = (tab.content ?? '').trim().length > 0
        const shouldPromptToSave = hasContent && tab.isDirty
        if (!shouldPromptToSave) continue
        const suggestedName = ensureMarkdownFileName(tab.title || 'untitled')
        // Save dialog is shown for non-empty tabs; cancel still closes per product request.
        await saveMarkdownWithNativeDialog(tab.content, suggestedName)
      }
    }

    const replacementTab = createNewTab(nextUntitledIndex)
    setNextUntitledIndex((current) => current + 1)
    setTabs([replacementTab])
    setSelectionRangesByTab({
      [replacementTab.id]: { start: 0, end: 0 },
    })
    setScrollPositionsByTab({
      [replacementTab.id]: { editorTop: 0, previewTop: 0 },
    })
    setActiveTabId(replacementTab.id)
    setIsPreviewOpen(false)
    resetGenerationState({ tabId: replacementTab.id })
  }, [abortGeneration, isLoadingPrompt, nextUntitledIndex, resetGenerationState, tabs])

  const handleSaveClick = useCallback(async () => {
    if (!activeTabId) return

    const suggestedName = ensureMarkdownFileName(activeTab?.title ?? 'untitled')

    if (isDesktopRuntime()) {
      if (activeTab?.filePath) {
        const savedPath = await saveMarkdownToPath(activeContent, activeTab.filePath)
        if (!savedPath) return

        const savedName = ensureMarkdownFileName(fileNameFromPath(savedPath))
        setTabs((currentTabs) =>
          replaceActiveTab(currentTabs, activeTabId, (tab) => ({
            ...tab,
            title: savedName,
            filePath: savedPath,
            lastSavedContent: activeContent,
            isDirty: false,
          })),
        )
        setPromptError('')
        return
      }

      const savedPath = await saveMarkdownWithNativeDialog(activeContent, suggestedName)
      if (!savedPath) return

      const savedName = ensureMarkdownFileName(fileNameFromPath(savedPath))
      setTabs((currentTabs) =>
        replaceActiveTab(currentTabs, activeTabId, (tab) => ({
          ...tab,
          title: savedName,
          filePath: savedPath,
          lastSavedContent: activeContent,
          isDirty: false,
        })),
      )
      setPromptError('')
      return
    }

    const blob = new Blob([activeContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = suggestedName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    setTabs((currentTabs) =>
      replaceActiveTab(currentTabs, activeTabId, (tab) => ({
        ...tab,
        title: suggestedName,
        lastSavedContent: activeContent,
        isDirty: false,
      })),
    )
    setPromptError('')
  }, [activeContent, activeTab, activeTabId, setPromptError])

  const handleSaveAsClick = useCallback(async () => {
    if (!activeTabId) return

    const suggestedName = ensureMarkdownFileName(activeTab?.title ?? 'untitled')

    if (isDesktopRuntime()) {
      const savedPath = await saveMarkdownWithNativeDialog(activeContent, suggestedName)
      if (!savedPath) return

      const savedName = ensureMarkdownFileName(fileNameFromPath(savedPath))
      setTabs((currentTabs) =>
        replaceActiveTab(currentTabs, activeTabId, (tab) => ({
          ...tab,
          title: savedName,
          filePath: savedPath,
          lastSavedContent: activeContent,
          isDirty: false,
        })),
      )
      setPromptError('')
      return
    }

    const blob = new Blob([activeContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = suggestedName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    setTabs((currentTabs) =>
      replaceActiveTab(currentTabs, activeTabId, (tab) => ({
        ...tab,
        title: suggestedName,
        lastSavedContent: activeContent,
        isDirty: false,
      })),
    )
    setPromptError('')
  }, [activeContent, activeTab?.title, activeTabId, setPromptError])

  const handleLoadClick = useCallback(async () => {
    if (isDesktopRuntime()) {
      const openedFile = await openMarkdownWithNativeDialog()
      if (!openedFile) return

      const path = typeof openedFile.path === 'string' ? openedFile.path.trim() : ''
      const loadedContent = typeof openedFile.content === 'string' ? openedFile.content : ''
      if (!path) {
        setPromptError('Unable to open the selected file.')
        return
      }
      if (exceedsLoadFileSizeLimit(loadedContent)) {
        setPromptError(FILE_TOO_LARGE_MESSAGE)
        return
      }

      const fileTitle = ensureMarkdownFileName(fileNameFromPath(path))
      const nextTab = {
        ...createNewTab(nextUntitledIndex),
        title: fileTitle,
        content: loadedContent,
        filePath: path,
        lastSavedContent: loadedContent,
        isDirty: false,
      }

      if (shouldReplaceEmptyUntitledActiveTab && activeTabId) {
        setTabs((currentTabs) =>
          replaceActiveTab(currentTabs, activeTabId, (tab) => ({
            ...tab,
            title: fileTitle,
            content: loadedContent,
            filePath: path,
            lastSavedContent: loadedContent,
            isDirty: false,
          })),
        )
      } else {
        setNextUntitledIndex((current) => current + 1)
        setTabs((currentTabs) => [...currentTabs, nextTab])
        setActiveTabId(nextTab.id)
      }

      const targetTabId = shouldReplaceEmptyUntitledActiveTab && activeTabId ? activeTabId : nextTab.id
      setSelectionRangesByTab((currentRanges) => ({
        ...currentRanges,
        [targetTabId]: { start: 0, end: 0 },
      }))
      setScrollPositionsByTab((currentPositions) => ({
        ...currentPositions,
        [targetTabId]: { editorTop: 0, previewTop: 0 },
      }))
      resetGenerationState({ tabId: targetTabId })
      setPromptError('')
      return
    }

    fileInputRef.current?.click()
  }, [
    activeTabId,
    nextUntitledIndex,
    resetGenerationState,
    setPromptError,
    shouldReplaceEmptyUntitledActiveTab,
  ])

  useEffect(() => {
    saveActionRef.current = handleSaveClick
    saveAsActionRef.current = handleSaveAsClick
    openActionRef.current = handleLoadClick
    newActionRef.current = handleNew
  }, [handleLoadClick, handleNew, handleSaveAsClick, handleSaveClick])

  useEffect(() => {
    closeActionRef.current = () => {
      if (!activeTabId) return
      handleCloseTab(activeTabId)
    }
  }, [activeTabId, handleCloseTab])

  useEffect(() => {
    closeAllActionRef.current = () => {
      void handleCloseAllTabs()
    }
  }, [handleCloseAllTabs])

  const handleLoadFile = useCallback(
    (event) => {
      const file = event.target.files?.[0]
      if (!file) return

      if (file.size > MAX_LOAD_FILE_SIZE_BYTES) {
        setPromptError(FILE_TOO_LARGE_MESSAGE)
        event.target.value = ''
        return
      }

      setPromptError('')
      const reader = new FileReader()
      reader.onload = (loadEvent) => {
        const loadedContent = loadEvent.target?.result?.toString() ?? ''
        const nextTab = {
          ...createNewTab(nextUntitledIndex),
          content: loadedContent,
          title: file.name,
          filePath: '',
          lastSavedContent: loadedContent,
          isDirty: false,
        }
        const targetTabId = shouldReplaceEmptyUntitledActiveTab && activeTabId ? activeTabId : nextTab.id

        if (shouldReplaceEmptyUntitledActiveTab && activeTabId) {
          setTabs((currentTabs) =>
            replaceActiveTab(currentTabs, activeTabId, (tab) => ({
              ...tab,
              content: loadedContent,
              title: file.name,
              filePath: '',
              lastSavedContent: loadedContent,
              isDirty: false,
            })),
          )
        } else {
          setNextUntitledIndex((current) => current + 1)
          setTabs((currentTabs) => [...currentTabs, nextTab])
          setActiveTabId(nextTab.id)
        }

        setSelectionRangesByTab((currentRanges) => ({
          ...currentRanges,
          [targetTabId]: { start: 0, end: 0 },
        }))
        setScrollPositionsByTab((currentPositions) => ({
          ...currentPositions,
          [targetTabId]: { editorTop: 0, previewTop: 0 },
        }))
        resetGenerationState({ tabId: targetTabId })
      }
      reader.onerror = () => {
        setPromptError('Unable to read the selected file.')
      }
      reader.readAsText(file)
      event.target.value = ''
    },
    [
      activeTabId,
      nextUntitledIndex,
      resetGenerationState,
      setPromptError,
      shouldReplaceEmptyUntitledActiveTab,
    ],
  )

  const handleOpenRecent = useCallback(
    (payload = {}) => {
      const path = typeof payload?.path === 'string' ? payload.path.trim() : ''
      const content = typeof payload?.content === 'string' ? payload.content : ''
      if (!path) {
        setPromptError('Unable to open recent file: missing file path.')
        return
      }
      if (exceedsLoadFileSizeLimit(content)) {
        setPromptError(FILE_TOO_LARGE_MESSAGE)
        return
      }

      const fileTitle = ensureMarkdownFileName(fileNameFromPath(path))
      const nextTab = {
        ...createNewTab(nextUntitledIndex),
        content,
        title: fileTitle,
        filePath: path,
        lastSavedContent: content,
        isDirty: false,
      }
      const targetTabId = shouldReplaceEmptyUntitledActiveTab && activeTabId ? activeTabId : nextTab.id

      if (shouldReplaceEmptyUntitledActiveTab && activeTabId) {
        setTabs((currentTabs) =>
          replaceActiveTab(currentTabs, activeTabId, (tab) => ({
            ...tab,
            content,
            title: fileTitle,
            filePath: path,
            lastSavedContent: content,
            isDirty: false,
          })),
        )
      } else {
        setNextUntitledIndex((current) => current + 1)
        setTabs((currentTabs) => [...currentTabs, nextTab])
        setActiveTabId(nextTab.id)
      }

      setSelectionRangesByTab((currentRanges) => ({
        ...currentRanges,
        [targetTabId]: { start: 0, end: 0 },
      }))
      setScrollPositionsByTab((currentPositions) => ({
        ...currentPositions,
        [targetTabId]: { editorTop: 0, previewTop: 0 },
      }))
      resetGenerationState({ tabId: targetTabId })
      setPromptError('')
    },
    [
      activeTabId,
      nextUntitledIndex,
      resetGenerationState,
      setPromptError,
      shouldReplaceEmptyUntitledActiveTab,
    ],
  )

  const handleOpenRecentError = useCallback(
    (payload) => {
      const message =
        typeof payload === 'string' && payload.trim()
          ? payload.trim()
          : 'Unable to open recent file.'
      setPromptError(message)
    },
    [setPromptError],
  )

  const handleCopyClick = useCallback(async () => {
    const rawSelection = document.getSelection()?.toString() ?? ''
    const hasRangeSelection = selectionRange.start !== selectionRange.end
    const editorSelection = hasRangeSelection
      ? activeContent.slice(selectionRange.start, selectionRange.end)
      : ''
    const textToCopy = rawSelection || editorSelection || activeContent

    try {
      await navigator.clipboard.writeText(textToCopy)
      setPromptError('')
    } catch (error) {
      setPromptError(error?.message ?? 'Unable to copy text to the clipboard.')
    }
  }, [activeContent, selectionRange.end, selectionRange.start, setPromptError])

  const handlePrintClick = useCallback(() => {
    if (!activeTab) return
    printRenderedMarkdown(activeContent, isMdPromptsVisible)
  }, [activeContent, activeTab])

  useEffect(() => {
    printActionRef.current = handlePrintClick
  }, [handlePrintClick])

  const handlePromptOpen = useCallback(
    (payload = {}) => {
      if (!activeTabId) return
      if (typeof payload?.selectionStart === 'number' && typeof payload?.selectionEnd === 'number') {
        setSelectionRangesByTab((currentRanges) => ({
          ...currentRanges,
          [activeTabId]: { start: payload.selectionStart, end: payload.selectionEnd },
        }))
      }
    },
    [activeTabId],
  )

  const handleSelectionChange = useCallback(
    (payload = {}) => {
      if (!activeTabId) return
      if (typeof payload?.selectionStart === 'number' && typeof payload?.selectionEnd === 'number') {
        setSelectionRangesByTab((currentRanges) => ({
          ...currentRanges,
          [activeTabId]: { start: payload.selectionStart, end: payload.selectionEnd },
        }))
      }
    },
    [activeTabId],
  )

  const handleEditorScrollPositionChange = useCallback(
    (payload = {}) => {
      if (!activeTabId) return
      const scrollTop = Number(payload.scrollTop)
      const nextTop = Number.isFinite(scrollTop) ? Math.max(0, scrollTop) : 0
      setScrollPositionsByTab((currentPositions) => {
        const previous = currentPositions[activeTabId] ?? { editorTop: 0, previewTop: 0 }
        if (Math.abs(previous.editorTop - nextTop) < 1 && Math.abs(previous.previewTop - nextTop) < 1) {
          return currentPositions
        }
        return {
          ...currentPositions,
          [activeTabId]: {
            ...previous,
            editorTop: nextTop,
            previewTop: nextTop,
          },
        }
      })
    },
    [activeTabId],
  )

  const handlePreviewContentClick = useCallback(
    (event) => {
      const anchor = event.target?.closest?.('a[href]')
      if (anchor instanceof HTMLAnchorElement) {
        const href = anchor.getAttribute('href') || ''
        if (!isSafeMarkdownUrl(href)) {
          event.preventDefault()
          return
        }

        event.preventDefault()
        if (isDesktopRuntime()) {
          void openExternalUrl(href)
          return
        }

        window.open(href, '_blank', 'noopener,noreferrer')
        return
      }

      const checkbox = event.target
      if (!(checkbox instanceof HTMLInputElement) || checkbox.type !== 'checkbox') return
      const sourceLine = Number(checkbox.dataset.sourceLine)
      if (!Number.isInteger(sourceLine) || !activeTabId) return

      setTabs((currentTabs) => {
        const targetTab = currentTabs.find((tab) => tab.id === activeTabId)
        if (!targetTab) return currentTabs

        const nextContent = toggleCheckboxOnLine(targetTab.content, sourceLine, checkbox.checked)
        return updateTabContent(currentTabs, activeTabId, nextContent)
      })
    },
    [activeTabId],
  )

  const handleAlwaysOnTopToggle = useCallback(() => {
    setIsAlwaysOnTop((previous) => {
      const nextValue = !previous
      try {
        window.localStorage.setItem(ALWAYS_ON_TOP_STORAGE_KEY, String(nextValue))
      } catch {
        // Continue even if storage is unavailable.
      }
      return nextValue
    })
  }, [])

  const updateSetting = useCallback(
    async (key, value) => {
      setSettings((current) => {
        const next = { ...current, [key]: value }
        if (isDesktopRuntime()) {
          void saveSettings(next)
        }
        return next
      })

      if (key === 'defaultTheme') {
        setTheme(value === 'light' ? 'light' : 'dark')
      }

      if (key === 'defaultTextZoom') {
        setEditorTextZoomPercent(normalizeTextZoom(value))
      }

      if (key === 'defaultAlwaysOnTop') {
        setIsAlwaysOnTop(Boolean(value))
      }

      if (key === 'defaultFooterCollapsed') {
        setIsFooterCollapsed(Boolean(value))
      }

      if (key === 'defaultStartupPreview') {
        setIsPreviewOpen(Boolean(value))
      }

      if (key === 'defaultSpellCheck') {
        setIsSpellCheckEnabled(Boolean(value))
      }

      if (key === 'defaultModel') {
        setSelectedModel(value || '')
      }
      if (key === 'defaultShowMdPrompts') {
        setIsMdPromptsVisible(Boolean(value))
      }
    },
    [setSelectedModel],
  )

  const handleShowPreview = useCallback(() => {
    setIsPreviewOpen(true)
  }, [])

  const handleShowTextEdit = useCallback(() => {
    setIsPreviewOpen(false)
  }, [])

  const handleTogglePreview = useCallback(() => {
    setIsPreviewOpen((previous) => !previous)
  }, [])

  const handleToggleFooter = useCallback(() => {
    setIsFooterCollapsed((previous) => !previous)
  }, [])

  const handleToggleTabBar = useCallback(() => {
    setIsTabBarVisible((previous) => !previous)
  }, [])

  const handleTogglePromptPanel = useCallback(() => {
    setIsPromptPanelHidden((previous) => !previous)
    setIsFindReplaceOpen(false)
  }, [])

  const handleToggleColoredStreamingOutput = useCallback(() => {
    setIsColoredStreamingOutputEnabled((previous) => !previous)
  }, [])

  const handleShowFindReplace = useCallback(() => {
    if (!activeTabId) return
    const selectedText =
      selectionRange.start !== selectionRange.end
        ? activeContent.slice(
            Math.min(selectionRange.start, selectionRange.end),
            Math.max(selectionRange.start, selectionRange.end),
          )
        : ''

    if (selectedText) {
      setFindQuery(selectedText)
    }
    setFindStatusMessage('')
    setIsPreviewOpen(false)
    setIsFindReplaceOpen(true)
  }, [activeContent, activeTabId, selectionRange.end, selectionRange.start])

  const handleCloseFindReplace = useCallback(() => {
    setIsFindReplaceOpen(false)
    setFindStatusMessage('')
    setEditorFocusRequestId((current) => current + 1)
  }, [])

  const handleShowAutoSave = useCallback(() => {
    setIsWordListOpen(false)
    setIsTextZoomOpen(false)
    setIsSettingsOpen(true)
  }, [])

  const handleShowSpellCheck = useCallback(async () => {
    setIsSettingsOpen(false)
    setIsWordListOpen(false)
    setIsTextZoomOpen(false)
    setIsSpellCheckScanOpen(true)
    setSpellCheckScanItems([])
    setSpellCheckScanTotal(0)
    setSpellCheckScanStatus('Scanning…')

    const loaded = await preloadSpellcheck()
    if (!loaded) {
      setSpellCheckScanStatus('Spellcheck dictionary is unavailable right now.')
      return
    }

    const items = getMisspelledWordCounts(activeContent)
    const total = items.reduce((sum, item) => sum + item.count, 0)
    setSpellCheckScanItems(items)
    setSpellCheckScanTotal(total)
    setSpellCheckScanStatus('')
  }, [activeContent])

  const handleThemeToggle = useCallback(() => {
    const nextTheme = isDark ? 'light' : 'dark'
    void updateSetting('defaultTheme', nextTheme)
  }, [isDark, updateSetting])

  const exportMarkdownSource = useMemo(() => {
    const source = isMdPromptsVisible ? activeContent : stripInlinePromptTokensForPresentation(activeContent)
    return normalizeCustomCheckboxLines(source)
  }, [activeContent, isMdPromptsVisible])

  const exportHtmlDocument = useMemo(() => {
    const body = renderMarkdownToSafeHtml(exportMarkdownSource)
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(activeTab?.title || 'Document')}</title>
</head>
<body>
${body}
</body>
</html>
`
  }, [activeTab?.title, exportMarkdownSource])

  const getExportBaseName = useCallback(() => {
    const base = stripExtension(activeTab?.title || 'untitled').trim()
    return base || 'untitled'
  }, [activeTab?.title])

  const exportWithNativeDialog = useCallback(
    async ({ content, extension, filterName }) => {
      const suggestedName = `${getExportBaseName()}.${extension}`
      const savedPath = await saveTextFileWithNativeDialog({
        content,
        suggestedName,
        filterName,
        extensions: [extension],
      })
      return Boolean(savedPath)
    },
    [getExportBaseName],
  )

  const handleExportCopyHtml = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportHtmlDocument)
      setPromptError('')
    } catch (error) {
      setPromptError(error?.message ?? 'Unable to copy HTML to the clipboard.')
    }
  }, [exportHtmlDocument, setPromptError])

  const handleExportCopyRichText = useCallback(async () => {
    const plainText = exportMarkdownSource
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        const item = new ClipboardItem({
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
          'text/html': new Blob([exportHtmlDocument], { type: 'text/html' }),
        })
        await navigator.clipboard.write([item])
      } else {
        await navigator.clipboard.writeText(plainText)
      }
      setPromptError('')
    } catch (error) {
      setPromptError(error?.message ?? 'Unable to copy rich text to the clipboard.')
    }
  }, [exportHtmlDocument, exportMarkdownSource, setPromptError])

  const handleExportHtml = useCallback(async () => {
    await exportWithNativeDialog({
      content: exportHtmlDocument,
      extension: 'html',
      filterName: 'HTML',
    })
  }, [exportHtmlDocument, exportWithNativeDialog])

  const handleExportPdf = useCallback(async () => {
    printRenderedMarkdown(exportMarkdownSource, isMdPromptsVisible)
  }, [exportMarkdownSource, isMdPromptsVisible])

  const handleExportRtf = useCallback(async () => {
    const rtfContent = `{\\rtf1\\ansi\\deff0\n${escapeRtf(exportMarkdownSource)}\n}`
    await exportWithNativeDialog({
      content: rtfContent,
      extension: 'rtf',
      filterName: 'RTF',
    })
  }, [exportMarkdownSource, exportWithNativeDialog])

  const handleExportWord = useCallback(async () => {
    await exportWithNativeDialog({
      content: exportHtmlDocument,
      extension: 'doc',
      filterName: 'Word',
    })
  }, [exportHtmlDocument, exportWithNativeDialog])

  const handleExportLatex = useCallback(async () => {
    const latex = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\begin{document}
${escapeLatex(exportMarkdownSource)}
\\end{document}
`
    await exportWithNativeDialog({
      content: latex,
      extension: 'tex',
      filterName: 'LaTeX',
    })
  }, [exportMarkdownSource, exportWithNativeDialog])

  const handleExportDiagnostics = useCallback(async () => {
    if (!isDesktopRuntime()) {
      setPromptError('Diagnostics export is only available in the desktop app.')
      return
    }

    const bundle = await exportDiagnosticsBundle()
    if (!bundle) {
      setPromptError('Unable to prepare diagnostics bundle.')
      return
    }

    const savedPath = await saveTextFileWithNativeDialog({
      content: bundle,
      suggestedName: 'ghost-writer-diagnostics.json',
      filterName: 'JSON',
      extensions: ['json'],
    })
    if (!savedPath) return
    setPromptError('')
  }, [setPromptError])

  const handleWordListSave = useCallback(
    (nextWordList = [], nextWordListDisabled = []) => {
      const normalizedWordList = Array.isArray(nextWordList) ? nextWordList : DEFAULT_SETTINGS.customWordList
      const normalizedDisabled = Array.isArray(nextWordListDisabled)
        ? nextWordListDisabled
        : DEFAULT_SETTINGS.customWordListDisabled

      const nextSettings = {
        ...settings,
        customWordList: normalizedWordList,
        customWordListDisabled: normalizedDisabled,
      }

      setSettings(nextSettings)
      setCustomSpellcheckWords(resolveEnabledCustomWords(normalizedWordList, normalizedDisabled))
      setSpellcheckRefreshKey((current) => current + 1)

      if (isDesktopRuntime()) {
        void saveSettings(nextSettings)
      }
    },
    [settings],
  )

  useGlobalShortcuts({
    saveActionRef,
    saveAsActionRef,
    openActionRef,
    newActionRef,
    closeActionRef,
    closeAllActionRef,
    printActionRef,
    onToggleAlwaysOnTop: handleAlwaysOnTopToggle,
    onTogglePreview: handleTogglePreview,
    onToggleFooter: handleToggleFooter,
    onToggleTabBar: handleToggleTabBar,
    onTogglePromptPanel: handleTogglePromptPanel,
    onShowFindReplace: handleShowFindReplace,
  })

  useTauriMenuEvents({
    onNew: handleNew,
    onOpen: handleLoadClick,
    onClose: () => {
      if (!activeTabId) return
      void handleCloseTab(activeTabId)
    },
    onCloseAll: () => {
      void handleCloseAllTabs()
    },
    onDuplicate: handleDuplicate,
    onRename: handleRename,
    onOpenRecent: handleOpenRecent,
    onOpenRecentError: handleOpenRecentError,
    onSave: handleSaveClick,
    onSaveAs: handleSaveAsClick,
    onPrint: handlePrintClick,
    onShowPreview: handleShowPreview,
    onShowTextEdit: handleShowTextEdit,
    onToggleAlwaysOnTop: handleAlwaysOnTopToggle,
    onToggleFooter: handleToggleFooter,
    onToggleTabBar: handleToggleTabBar,
    onTogglePromptPanel: handleTogglePromptPanel,
    onToggleMdPrompts: handleToggleMdPrompts,
    onToggleColoredOutput: handleToggleColoredStreamingOutput,
    onShowSettings: () => {
      setIsWordListOpen(false)
      setIsTextZoomOpen(false)
      setIsSettingsOpen(true)
    },
    onShowWordList: () => {
      setIsSettingsOpen(false)
      setIsTextZoomOpen(false)
      setIsWordListOpen(true)
    },
    onShowTextZoom: () => {
      setIsSettingsOpen(false)
      setIsWordListOpen(false)
      setIsTextZoomOpen(true)
    },
    onShowAutoSave: handleShowAutoSave,
    onShowSpellCheck: () => {
      void handleShowSpellCheck()
    },
    onExportCopyHtml: () => {
      void handleExportCopyHtml()
    },
    onExportCopyRichText: () => {
      void handleExportCopyRichText()
    },
    onExportHtml: () => {
      void handleExportHtml()
    },
    onExportPdf: () => {
      void handleExportPdf()
    },
    onExportRtf: () => {
      void handleExportRtf()
    },
    onExportWord: () => {
      void handleExportWord()
    },
    onExportLatex: () => {
      void handleExportLatex()
    },
    onExportDiagnostics: () => {
      void handleExportDiagnostics()
    },
    onShowFindReplace: handleShowFindReplace,
    onShowAbout: () => setIsAboutOpen(true),
  })

  useLayoutEffect(() => {
    if (!isFindReplaceOpen) return

    if (!findInputRef.current) return
    findInputRef.current.focus()
    findInputRef.current.select()
  }, [isFindReplaceOpen])

  useEffect(() => {
    if (!isFindReplaceOpen) return

    const handleEscapeKey = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      handleCloseFindReplace()
    }

    window.addEventListener('keydown', handleEscapeKey)
    return () => {
      window.removeEventListener('keydown', handleEscapeKey)
    }
  }, [handleCloseFindReplace, isFindReplaceOpen])

  useEffect(() => {
    if (!isPreviewOpen || !previewContentRef.current) return

    const checkboxNodes = previewContentRef.current.querySelectorAll('input[type="checkbox"]')
    checkboxNodes.forEach((node, index) => {
      const sourceLine = checkboxLineIndexes[index]
      if (typeof sourceLine !== 'number') return
      node.removeAttribute('disabled')
      node.dataset.sourceLine = String(sourceLine)
      node.classList.add('preview__checkbox')
    })
  }, [checkboxLineIndexes, isPreviewOpen, renderedMarkdown])

  useEffect(() => {
    if (!isPreviewOpen) return
    const previewElement = previewContentRef.current
    if (!previewElement || !activeTabId) return

    const positions = scrollPositionsByTab[activeTabId] ?? { editorTop: 0, previewTop: 0 }
    const nextScrollTop =
      Number.isFinite(positions.previewTop) && positions.previewTop > 0
        ? positions.previewTop
        : positions.editorTop
    previewElement.scrollTop = Math.max(0, Number(nextScrollTop) || 0)
  }, [activeTabId, isPreviewOpen, scrollPositionsByTab])

  useEffect(() => {
    if (!isPreviewOpen || !activeTabId) return undefined
    const previewElement = previewContentRef.current
    if (!previewElement) return undefined

    const handlePreviewScroll = () => {
      const nextTop = Math.max(0, Number(previewElement.scrollTop) || 0)
      setScrollPositionsByTab((currentPositions) => {
        const previous = currentPositions[activeTabId] ?? { editorTop: 0, previewTop: 0 }
        if (Math.abs(previous.previewTop - nextTop) < 1 && Math.abs(previous.editorTop - nextTop) < 1) {
          return currentPositions
        }

        return {
          ...currentPositions,
          [activeTabId]: {
            ...previous,
            previewTop: nextTop,
            editorTop: nextTop,
          },
        }
      })
    }

    previewElement.addEventListener('scroll', handlePreviewScroll)
    return () => {
      previewElement.removeEventListener('scroll', handlePreviewScroll)
    }
  }, [activeTabId, isPreviewOpen])

  useEffect(() => {
    if (!isPreviewOpen) return undefined

    const handleEscapeKey = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setIsPreviewOpen(false)
    }

    window.addEventListener('keydown', handleEscapeKey)
    return () => {
      window.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isPreviewOpen])

  return (
    <div ref={appRef} className={`app${isDark ? ' app--dark' : ''}`}>
      {showDragRegion && <div className="app__drag-region" aria-hidden="true" />}
      {isTabBarVisible && (
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={handleTabSelect}
          onCreateTab={handleNew}
          onCloseTab={handleCloseTab}
        />
      )}
      <main className={`app__main${isPromptPanelHidden ? ' app__main--focus-editor' : ''}`}>
        <div className={`editor-pane${isPreviewOpen || isPromptPanelHidden ? ' editor-pane--preview' : ''}`}>
          {isPreviewOpen ? (
            <section className={`preview preview--full${isDark ? ' preview--dark' : ''}`} aria-label="Markdown preview">
              <div
                ref={previewContentRef}
                className="preview__content"
                onClick={handlePreviewContentClick}
                dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
              />
            </section>
          ) : (
            <Editor
              value={activeContent}
              onChange={(nextValue) => {
                if (!activeTabId) return
                setTabContentById(activeTabId, nextValue)
              }}
              onPromptOpen={handlePromptOpen}
              onSelectionChange={handleSelectionChange}
              onScrollPositionChange={handleEditorScrollPositionChange}
              selectionRange={selectionRange}
              showSelectionOverlay={isPromptFocused}
              spellCheckEnabled={isSpellCheckEnabled}
              spellcheckRefreshKey={spellcheckRefreshKey}
              textZoomPercent={editorTextZoomPercent}
              externalSelectionRange={selectionRange}
              externalScrollTop={scrollPositionsByTab[activeTabId]?.editorTop ?? 0}
              focusRequestId={editorFocusRequestId}
              streamingRange={activeStreamingRange}
              streamingColorEnabled={isColoredStreamingOutputEnabled}
            />
          )}
        </div>
        {isFindReplaceOpen && !isPreviewOpen && !isPromptPanelHidden && (
          <section className={`find-replace${isDark ? ' find-replace--dark' : ''}`} aria-label="Find and replace panel">
            <div className="find-replace__row">
              <div className="find-replace__field">
                <input
                  id="find-replace-find-input"
                  ref={findInputRef}
                  className="find-replace__input"
                  type="text"
                  value={findQuery}
                  aria-label="Find"
                  placeholder="Find"
                  onChange={(event) => {
                    setFindQuery(event.target.value)
                    setFindStatusMessage('')
                  }}
                />
              </div>
              <div className="find-replace__field">
                <input
                  id="find-replace-replace-input"
                  className="find-replace__input"
                  type="text"
                  value={replaceQuery}
                  aria-label="Replace"
                  placeholder="Replace"
                  onChange={(event) => setReplaceQuery(event.target.value)}
                />
              </div>
            </div>
            <div className="find-replace__actions">
              <div className="find-replace__meta">
                <button
                  type="button"
                  className={`find-replace__toggle${isFindCaseSensitive ? ' find-replace__toggle--active' : ''}`}
                  onClick={() => {
                    setIsFindCaseSensitive((previous) => !previous)
                    setFindStatusMessage('')
                  }}
                  aria-label="Toggle case sensitive search"
                  aria-pressed={isFindCaseSensitive}
                  title="Case sensitive"
                >
                  <span className="material-symbols-rounded" aria-hidden="true">
                    match_case
                  </span>
                </button>
                {findStatusDisplay ? (
                  <p className="find-replace__status" role="status" aria-live="polite">
                    {findStatusDisplay}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="find-replace__button"
                onClick={() => jumpToFindMatch(-1)}
                aria-label="Find previous match"
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  navigate_before
                </span>
              </button>
              <button
                type="button"
                className="find-replace__button"
                onClick={() => jumpToFindMatch(1)}
                aria-label="Find next match"
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  navigate_next
                </span>
              </button>
              <button
                type="button"
                className="find-replace__button"
                onClick={handleReplaceOne}
                aria-label="Replace current match"
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  find_replace
                </span>
              </button>
              <button
                type="button"
                className="find-replace__button"
                onClick={handleReplaceAll}
                aria-label="Replace all matches"
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  done_all
                </span>
              </button>
              <button
                type="button"
                className="find-replace__button"
                onClick={handleCloseFindReplace}
                aria-label="Close find and replace"
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
          </section>
        )}
        {!isPreviewOpen && !isPromptPanelHidden && (
          <PromptPanel
            isDark={isDark}
            promptFormRef={promptFormRef}
            handlePromptSubmit={handlePromptSubmit}
            promptText={promptText}
            setPromptText={setPromptText}
            handlePromptKeyDown={handlePromptKeyDown}
            setIsPromptFocused={setIsPromptFocused}
            showStoppedToast={showStoppedToast}
            isLoadingPrompt={isLoadingPrompt}
            canSubmitPrompt={canSubmitPrompt}
            handlePrimaryPromptAction={handlePrimaryPromptAction}
            handleUndoToggle={handleUndoToggle}
            canUndoGeneration={canUndoGeneration}
            canRedoGeneration={canRedoGeneration}
            undoToggleState={undoToggleState}
            handleClearPrompt={handleClearPrompt}
            promptError={promptError}
          />
        )}
      </main>
      <FooterBar
        footerRef={footerRef}
        isFooterCollapsed={isFooterCollapsed}
        setIsFooterCollapsed={setIsFooterCollapsed}
        handleNew={handleNew}
        handleSaveClick={handleSaveClick}
        handleLoadClick={handleLoadClick}
        handleCopyClick={handleCopyClick}
        isPreviewOpen={isPreviewOpen}
        handleTogglePreview={handleTogglePreview}
        modKeyLabel={modKeyLabel}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        models={models}
        loadModels={loadModels}
        isLoadingModels={isLoadingModels}
        modelLoadStatus={modelLoadStatus}
        isDark={isDark}
        onToggleTheme={handleThemeToggle}
        isAlwaysOnTop={isAlwaysOnTop}
        handleAlwaysOnTopToggle={handleAlwaysOnTopToggle}
      />
      <input
        ref={fileInputRef}
        className="doc-actions__file"
        type="file"
        accept={'.md,text/markdown,text/plain'}
        onChange={handleLoadFile}
      />
      <AppModals
        isAboutOpen={isAboutOpen}
        setIsAboutOpen={setIsAboutOpen}
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        isWordListOpen={isWordListOpen}
        setIsWordListOpen={setIsWordListOpen}
        isTextZoomOpen={isTextZoomOpen}
        setIsTextZoomOpen={setIsTextZoomOpen}
        isSpellCheckScanOpen={isSpellCheckScanOpen}
        setIsSpellCheckScanOpen={setIsSpellCheckScanOpen}
        spellCheckScanStatus={spellCheckScanStatus}
        spellCheckScanItems={spellCheckScanItems}
        spellCheckScanTotal={spellCheckScanTotal}
        settings={settings}
        updateSetting={updateSetting}
        saveWordListSettings={handleWordListSave}
        textZoomOptions={TEXT_ZOOM_OPTIONS}
        models={models}
        appName={appName}
        appVersion={appVersion}
        onExportDiagnostics={() => {
          void handleExportDiagnostics()
        }}
      />
    </div>
  )
}

export default App
