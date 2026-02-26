import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { setCustomSpellcheckWords } from './lib/spellcheck'
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
  const [isFooterCollapsed, setIsFooterCollapsed] = useState(true)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isWordListOpen, setIsWordListOpen] = useState(false)
  const [isTextZoomOpen, setIsTextZoomOpen] = useState(false)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [appName, setAppName] = useState('Ghost Writer')
  const [appVersion, setAppVersion] = useState('0.1.0')
  const [isPromptFocused, setIsPromptFocused] = useState(false)
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(() => readInitialAlwaysOnTop())
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isTabBarVisible, setIsTabBarVisible] = useState(true)
  const [isSpellCheckEnabled, setIsSpellCheckEnabled] = useState(DEFAULT_SETTINGS.defaultSpellCheck)
  const [editorTextZoomPercent, setEditorTextZoomPercent] = useState(() =>
    normalizeTextZoom(DEFAULT_SETTINGS.defaultTextZoom),
  )
  const [hasLoadedDesktopSettings, setHasLoadedDesktopSettings] = useState(() => !isDesktopRuntime())

  const isDark = theme === 'dark'
  const showDragRegion = isMacDesktopRuntime()
  const modKeyLabel = showDragRegion ? 'Cmd' : 'Ctrl'

  const fileInputRef = useRef(null)
  const promptFormRef = useRef(null)
  const saveActionRef = useRef(() => {})
  const openActionRef = useRef(() => {})
  const newActionRef = useRef(() => {})
  const closeActionRef = useRef(() => {})
  const printActionRef = useRef(() => {})
  const appRef = useRef(null)
  const footerRef = useRef(null)
  const previewContentRef = useRef(null)
  const lastPersistedSessionRef = useRef({ paths: [], activePath: '' })

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [tabs, activeTabId])
  const selectionRange = selectionRangesByTab[activeTabId] ?? { start: 0, end: 0 }
  const activeContent = activeTab?.content ?? ''

  const { models, selectedModel, setSelectedModel, isLoadingModels, modelLoadStatus, loadModels } =
    useModelLoader({ bundledModels: BUNDLED_MODELS })

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
  const normalizedPreviewMarkdown = useMemo(
    () =>
      isPreviewOpen
        ? normalizeCustomCheckboxLines(stripInlinePromptTokensForPresentation(activeContent))
        : '',
    [activeContent, isPreviewOpen],
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
  }, [setSelectedModel])

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
      if (hasContent && isDesktopRuntime()) {
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

      if (remainingTabs.length === 0) {
        const replacementTab = createNewTab(nextUntitledIndex)
        setNextUntitledIndex((current) => current + 1)
        setTabs([replacementTab])
        setSelectionRangesByTab({
          [replacementTab.id]: { start: 0, end: 0 },
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

  const handleLoadClick = useCallback(async () => {
    if (isDesktopRuntime()) {
      if (!activeTabId) return
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
      setTabs((currentTabs) =>
        replaceActiveTab(currentTabs, activeTabId, (tab) => ({
          ...tab,
          content: loadedContent,
          title: fileTitle,
          filePath: path,
          lastSavedContent: loadedContent,
          isDirty: false,
        })),
      )
      setSelectionRangesByTab((currentRanges) => ({
        ...currentRanges,
        [activeTabId]: { start: 0, end: 0 },
      }))
      resetGenerationState({ tabId: activeTabId })
      setPromptError('')
      return
    }

    fileInputRef.current?.click()
  }, [activeTabId, resetGenerationState, setPromptError])

  useEffect(() => {
    saveActionRef.current = handleSaveClick
    openActionRef.current = handleLoadClick
    newActionRef.current = handleNew
  }, [handleLoadClick, handleNew, handleSaveClick])

  useEffect(() => {
    closeActionRef.current = () => {
      if (!activeTabId) return
      handleCloseTab(activeTabId)
    }
  }, [activeTabId, handleCloseTab])

  const handleLoadFile = useCallback(
    (event) => {
      const file = event.target.files?.[0]
      if (!file || !activeTabId) return

      if (file.size > MAX_LOAD_FILE_SIZE_BYTES) {
        setPromptError(FILE_TOO_LARGE_MESSAGE)
        event.target.value = ''
        return
      }

      setPromptError('')
      const reader = new FileReader()
      reader.onload = (loadEvent) => {
        const loadedContent = loadEvent.target?.result?.toString() ?? ''
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
        setSelectionRangesByTab((currentRanges) => ({
          ...currentRanges,
          [activeTabId]: { start: 0, end: 0 },
        }))
        resetGenerationState({ tabId: activeTabId })
      }
      reader.onerror = () => {
        setPromptError('Unable to read the selected file.')
      }
      reader.readAsText(file)
      event.target.value = ''
    },
    [activeTabId, resetGenerationState, setPromptError],
  )

  const handleOpenRecent = useCallback(
    (payload = {}) => {
      if (!activeTabId) return

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
      setSelectionRangesByTab((currentRanges) => ({
        ...currentRanges,
        [activeTabId]: { start: 0, end: 0 },
      }))
      resetGenerationState({ tabId: activeTabId })
      setPromptError('')
    },
    [activeTabId, resetGenerationState, setPromptError],
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
    printRenderedMarkdown(activeContent)
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

  const handleThemeToggle = useCallback(() => {
    const nextTheme = isDark ? 'light' : 'dark'
    void updateSetting('defaultTheme', nextTheme)
  }, [isDark, updateSetting])

  const exportMarkdownSource = useMemo(() => {
    return normalizeCustomCheckboxLines(stripInlinePromptTokensForPresentation(activeContent))
  }, [activeContent])

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
    printRenderedMarkdown(exportMarkdownSource)
  }, [exportMarkdownSource])

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

      if (isDesktopRuntime()) {
        void saveSettings(nextSettings)
      }
    },
    [settings],
  )

  useGlobalShortcuts({
    saveActionRef,
    openActionRef,
    newActionRef,
    closeActionRef,
    printActionRef,
    onToggleAlwaysOnTop: handleAlwaysOnTopToggle,
    onTogglePreview: handleTogglePreview,
    onToggleFooter: handleToggleFooter,
    onToggleTabBar: handleToggleTabBar,
  })

  useTauriMenuEvents({
    onNew: handleNew,
    onOpen: handleLoadClick,
    onDuplicate: handleDuplicate,
    onRename: handleRename,
    onOpenRecent: handleOpenRecent,
    onOpenRecentError: handleOpenRecentError,
    onSave: handleSaveClick,
    onPrint: handlePrintClick,
    onShowPreview: handleShowPreview,
    onShowTextEdit: handleShowTextEdit,
    onToggleAlwaysOnTop: handleAlwaysOnTopToggle,
    onToggleFooter: handleToggleFooter,
    onToggleTabBar: handleToggleTabBar,
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
    onShowAbout: () => setIsAboutOpen(true),
  })

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
      <main className="app__main">
        <div className={`editor-pane${isPreviewOpen ? ' editor-pane--preview' : ''}`}>
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
              selectionRange={selectionRange}
              showSelectionOverlay={isPromptFocused}
              spellCheckEnabled={isSpellCheckEnabled}
              textZoomPercent={editorTextZoomPercent}
            />
          )}
        </div>
        {!isPreviewOpen && (
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
        settings={settings}
        updateSetting={updateSetting}
        saveWordListSettings={handleWordListSave}
        textZoomOptions={TEXT_ZOOM_OPTIONS}
        models={models}
        appName={appName}
        appVersion={appVersion}
      />
    </div>
  )
}

export default App
