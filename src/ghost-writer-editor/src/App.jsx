import { createElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
import { DEFAULT_APP_NAME, DEFAULT_APP_VERSION } from './lib/appMetadata'
import {
  collectCheckboxLineIndexes,
  normalizeCustomCheckboxLines,
  stripInlinePromptTokensForPresentation,
  toggleCheckboxOnLine,
} from './lib/contentTransforms'
import {
  closeCurrentWindow,
  ensureOllamaRunning,
  exitApp,
  exportDiagnosticsBundle,
  isDesktopRuntime,
  isMacDesktopRuntime,
  listenDesktopEvent,
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
import { exportRenderedMarkdownAsPdf, printRenderedMarkdown } from './lib/print'
import { getMisspelledWordCounts, preloadSpellcheck, setCustomSpellcheckWords } from './lib/spellcheck'
import {
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
  buildPlainTextRtfDocument,
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
const UNTITLED_TITLE_PATTERN = /^Untitled(?:\s+(\d+))?(?:\.md)?$/i
const FOOTER_ACTION_FEEDBACK_DURATION_MS = 1500
const FIND_REPLACE_HISTORY_LIMIT = 20
const EMPTY_SELECTION_RANGE = { start: 0, end: 0 }

function createInitialScrollPosition() {
  return {
    editorTop: 0,
    editorScrollHeight: 0,
    editorClientHeight: 0,
    previewTop: 0,
    previewScrollHeight: 0,
    previewClientHeight: 0,
  }
}

function getScrollableRange(scrollHeight, clientHeight) {
  const safeScrollHeight = Number(scrollHeight)
  const safeClientHeight = Number(clientHeight)
  if (!Number.isFinite(safeScrollHeight) || !Number.isFinite(safeClientHeight)) return 0
  return Math.max(0, safeScrollHeight - safeClientHeight)
}

function mapScrollTopBetweenRanges({
  sourceTop,
  sourceScrollHeight,
  sourceClientHeight,
  targetScrollHeight,
  targetClientHeight,
}) {
  const sourceRange = getScrollableRange(sourceScrollHeight, sourceClientHeight)
  const targetRange = getScrollableRange(targetScrollHeight, targetClientHeight)
  if (targetRange <= 0) return 0

  const safeSourceTop = Number.isFinite(Number(sourceTop)) ? Math.max(0, Number(sourceTop)) : 0
  if (sourceRange <= 0) {
    return Math.min(safeSourceTop, targetRange)
  }

  return Math.max(0, Math.min((safeSourceTop / sourceRange) * targetRange, targetRange))
}

function isWindowsPlatform() {
  return /Win/i.test(navigator.platform)
}

function getUntitledIndexFromTitle(title = '') {
  const match = UNTITLED_TITLE_PATTERN.exec(String(title).trim())
  if (!match) return null

  const value = Number(match[1] ?? '1')
  return Number.isInteger(value) && value > 0 ? value : null
}

function getNextUntitledIndexFromTabs(tabs = []) {
  const usedIndexes = new Set(
    tabs
      .map((tab) => getUntitledIndexFromTitle(tab?.title))
      .filter((index) => Number.isInteger(index) && index > 0),
  )

  let nextIndex = 1
  while (usedIndexes.has(nextIndex)) {
    nextIndex += 1
  }

  return nextIndex
}

function getPreviewEventTargetElement(target) {
  if (target instanceof HTMLElement) return target
  if (target instanceof Text) return target.parentElement
  return null
}

function buildReactPropsFromHtmlElement(element, key) {
  const props = { key }

  for (const attribute of [...element.attributes]) {
    const name = attribute.name
    const normalizedName = name.toLowerCase()
    const value = attribute.value

    if (normalizedName === 'class') {
      props.className = value
      continue
    }

    if (normalizedName === 'tabindex') {
      props.tabIndex = Number(value)
      continue
    }

    props[name] = value
  }

  return props
}

function renderWindowsPreviewReactNode(node, handlers, key) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null

  const element = /** @type {HTMLElement} */ (node)
  const tagName = element.tagName.toLowerCase()
  const props = buildReactPropsFromHtmlElement(element, key)

  if (tagName === 'button' && element.getAttribute('data-preview-checkbox') === 'true') {
    const sourceLine = Number(element.getAttribute('data-source-line'))
    const nextChecked = element.getAttribute('aria-pressed') !== 'true'
    props['data-preview-checkbox-control'] = 'true'
    props.onClick = (event) => {
      event.preventDefault()
      event.stopPropagation()
      handlers.onCheckboxToggle(sourceLine, nextChecked)
    }
  }

  if (tagName === 'a' && element.hasAttribute('href')) {
    props.onClick = (event) => {
      handlers.onLinkClick(event, element.getAttribute('href') || '')
    }
  }

  const children = [...element.childNodes]
    .map((child, index) => renderWindowsPreviewReactNode(child, handlers, `${key}-${index}`))
    .filter((child) => child !== null)

  return createElement(tagName, props, ...children)
}

function renderWindowsPreviewReactContent(html, handlers) {
  if (!html || typeof window === 'undefined') return null

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return [...doc.body.childNodes]
    .map((node, index) => renderWindowsPreviewReactNode(node, handlers, `preview-${index}`))
    .filter((node) => node !== null)
}

function App() {
  const initialTab = useMemo(() => createNewTab(1), [])
  const isWindows = useMemo(() => isWindowsPlatform(), [])

  const [theme, setTheme] = useState('dark')
  const [tabs, setTabs] = useState(() => [initialTab])
  const [activeTabId, setActiveTabId] = useState(() => initialTab.id)
  const [selectionRangesByTab, setSelectionRangesByTab] = useState(() => ({
    [initialTab.id]: { start: 0, end: 0 },
  }))
  const [scrollPositionsByTab, setScrollPositionsByTab] = useState(() => ({
    [initialTab.id]: createInitialScrollPosition(),
  }))
  const [previewOpenByTab, setPreviewOpenByTab] = useState(() => ({
    [initialTab.id]: false,
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
  const [appName, setAppName] = useState(DEFAULT_APP_NAME)
  const [appVersion, setAppVersion] = useState(DEFAULT_APP_VERSION)
  const [isPromptFocused, setIsPromptFocused] = useState(false)
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(() => readInitialAlwaysOnTop())
  const [isPromptPanelHidden, setIsPromptPanelHidden] = useState(false)
  // New: whether inline MD prompts ({{...}}) are visible in the Markdown preview
  const [isMdPromptsVisible, setIsMdPromptsVisible] = useState(DEFAULT_SETTINGS.defaultShowMdPrompts)
  const [isTabBarVisible, setIsTabBarVisible] = useState(true)
  const [isSpellCheckEnabled, setIsSpellCheckEnabled] = useState(DEFAULT_SETTINGS.defaultSpellCheck)
  const [editorTextZoomPercent, setEditorTextZoomPercent] = useState(() =>
    normalizeTextZoom(DEFAULT_SETTINGS.defaultTextZoom),
  )
  const [windowsSelectionContext, setWindowsSelectionContext] = useState(null)
  const [windowsSelectionContextHistoryByTab, setWindowsSelectionContextHistoryByTab] = useState({})
  const [hasLoadedDesktopSettings, setHasLoadedDesktopSettings] = useState(() => !isDesktopRuntime())
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false)
  const [findQuery, setFindQuery] = useState('')
  const [replaceQuery, setReplaceQuery] = useState('')
  const [isFindCaseSensitive, setIsFindCaseSensitive] = useState(false)
  const [footerActionFeedback, setFooterActionFeedback] = useState(null)
  const [findStatusMessage, setFindStatusMessage] = useState('')
  const [findReplaceHistoryByTab, setFindReplaceHistoryByTab] = useState({})
  const [editorFocusRequestId, setEditorFocusRequestId] = useState(0)
  const [streamingRangesByTab, setStreamingRangesByTab] = useState({})
  const [isColoredStreamingOutputEnabled, setIsColoredStreamingOutputEnabled] = useState(true)
  const [dirtyCloseConfirmTab, setDirtyCloseConfirmTab] = useState(null)
  const [alreadyOpenTab, setAlreadyOpenTab] = useState(null)

  const isDark = theme === 'dark'
  const showDragRegion = isMacDesktopRuntime()
  const modKeyLabel = showDragRegion ? 'Cmd' : 'Ctrl'
  const nextUntitledIndexFromTabs = useMemo(() => getNextUntitledIndexFromTabs(tabs), [tabs])

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
  const footerActionFeedbackTimeoutRef = useRef(null)
  const footerRef = useRef(null)
  const previewContentRef = useRef(null)
  const findInputRef = useRef(null)
  const lastPersistedSessionRef = useRef({ paths: [], activePath: '', sessionKey: '' })
  const previewScrollTopRef = useRef(0)
  const isPreviewScrollTickingRef = useRef(false)
  const scrollPositionsByTabRef = useRef(scrollPositionsByTab)
  const dirtyCloseConfirmResolverRef = useRef(null)
  const activeTabIdRef = useRef(activeTabId)

  const escapeFindQueryForRegex = useCallback((query) => {
    return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }, [])

  useEffect(() => {
    scrollPositionsByTabRef.current = scrollPositionsByTab
  }, [scrollPositionsByTab])

  useEffect(() => {
    activeTabIdRef.current = activeTabId
  }, [activeTabId])

  useEffect(() => {
    return () => {
      if (dirtyCloseConfirmResolverRef.current) {
        dirtyCloseConfirmResolverRef.current('cancel')
        dirtyCloseConfirmResolverRef.current = null
      }
    }
  }, [])

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [tabs, activeTabId])
  const isPreviewOpen = Boolean(previewOpenByTab[activeTabId])
  const selectionRange = selectionRangesByTab[activeTabId] ?? EMPTY_SELECTION_RANGE
  const activeStreamingRange = streamingRangesByTab[activeTabId] ?? null
  const activeContent = activeTab?.content ?? ''
  const shouldReplaceEmptyUntitledActiveTab = useMemo(() => {
    if (!activeTabId || !activeTab) return false
    const hasContent = (activeTab.content ?? '').trim().length > 0
    const isUntitled = /^Untitled(?:\s+\d+)?(?:\.md)?$/i.test((activeTab.title ?? '').trim())

    return !hasContent && !activeTab.isDirty && !activeTab.filePath && isUntitled
  }, [activeTab, activeTabId])

  const findTabByFilePath = useCallback(
    (targetPath) => {
      const normalizedPath = typeof targetPath === 'string' ? targetPath.trim() : ''
      if (!normalizedPath) return null

      return (
        tabs.find((tab) => (tab.filePath ?? '').trim() === normalizedPath) ?? null
      )
    },
    [tabs],
  )

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

  const setPreviewOpenForTab = useCallback((tabId, value) => {
    if (!tabId) return

    setPreviewOpenByTab((currentStates) => {
      const previousValue = Boolean(currentStates[tabId])
      const nextValue = typeof value === 'function' ? Boolean(value(previousValue)) : Boolean(value)
      const hasStoredValue = Object.prototype.hasOwnProperty.call(currentStates, tabId)
      if (hasStoredValue && previousValue === nextValue) {
        return currentStates
      }

      return {
        ...currentStates,
        [tabId]: nextValue,
      }
    })
  }, [])

  const getSessionSnapshotTabs = useCallback(
    (tabsToSnapshot) =>
      tabsToSnapshot.map((tab) => ({
        id: String(tab.id || ''),
        title: String(tab.title || 'Untitled'),
        content: String(tab.content || ''),
        filePath: String(tab.filePath || ''),
        lastSavedContent: String(tab.lastSavedContent || ''),
        isDirty: Boolean(tab.isDirty),
        isPreviewOpen: Boolean(previewOpenByTab[tab.id]),
      })),
    [previewOpenByTab],
  )

  const resolveDirtyCloseConfirm = useCallback((decision = 'cancel') => {
    const resolver = dirtyCloseConfirmResolverRef.current
    dirtyCloseConfirmResolverRef.current = null
    setDirtyCloseConfirmTab(null)
    if (resolver) {
      resolver(decision)
    }
  }, [])

  const requestDirtyCloseConfirm = useCallback(
    async (tab) =>
      new Promise((resolve) => {
        if (dirtyCloseConfirmResolverRef.current) {
          dirtyCloseConfirmResolverRef.current('cancel')
        }

        dirtyCloseConfirmResolverRef.current = resolve
        setDirtyCloseConfirmTab(tab ?? null)
      }),
    [],
  )

  const tabNeedsDirtyClosePrompt = useCallback((tab) => {
    const hasContent = String(tab?.content || '').trim().length > 0
    return Boolean(hasContent && tab?.isDirty && isDesktopRuntime())
  }, [])

  const promptToSaveDirtyTab = useCallback(async (tab) => {
    if (!tabNeedsDirtyClosePrompt(tab)) {
      return { didContinue: true }
    }

    const closeDecision = await requestDirtyCloseConfirm(tab)
    if (closeDecision === 'cancel') {
      return { didContinue: false }
    }

    if (closeDecision === 'discard') {
      return { didContinue: true, skippedSave: true }
    }

    const tabContent = String(tab?.content || '')
    const savedPath = tab?.filePath
      ? await saveMarkdownToPath(tabContent, tab.filePath)
      : await saveMarkdownWithNativeDialog(tabContent, ensureMarkdownFileName(tab?.title || 'untitled'))
    if (!savedPath) {
      return { didContinue: false }
    }

    return { didContinue: true, savedPath }
  }, [requestDirtyCloseConfirm, tabNeedsDirtyClosePrompt])

  const confirmSafeToCloseTabs = useCallback(
    async (tabsToClose = []) => {
      for (const tab of tabsToClose) {
        const result = await promptToSaveDirtyTab(tab)
        if (!result.didContinue) {
          return false
        }
      }
      return true
    },
    [promptToSaveDirtyTab],
  )

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
  const activeWindowsSelectionContext = useMemo(() => {
    if (!isWindows || !windowsSelectionContext || windowsSelectionContext.tabId !== activeTabId) {
      return null
    }

    const safeStart = Math.max(0, Math.min(windowsSelectionContext.start ?? 0, activeContent.length))
    const safeEnd = Math.max(safeStart, Math.min(windowsSelectionContext.end ?? safeStart, activeContent.length))
    const currentSlice = activeContent.slice(safeStart, safeEnd)
    const isInvalid =
      windowsSelectionContext.contentSnapshot !== activeContent || windowsSelectionContext.text !== currentSlice

    return {
      ...windowsSelectionContext,
      start: safeStart,
      end: safeEnd,
      isInvalid,
      characterCount: windowsSelectionContext.text.length,
    }
  }, [activeContent, activeTabId, isWindows, windowsSelectionContext])
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

  const clearWindowsSelectionContext = useCallback(() => {
    setWindowsSelectionContext(null)
  }, [])

  const clearVisibleSelectionRange = useCallback((tabId) => {
    if (!tabId) return
    setSelectionRangesByTab((currentRanges) => {
      if (!currentRanges[tabId]) return currentRanges
      const next = { ...currentRanges }
      delete next[tabId]
      return next
    })
  }, [])

  const clearFindReplaceHistoryForTab = useCallback((tabId) => {
    if (!tabId) return
    setFindReplaceHistoryByTab((current) => {
      if (!current[tabId]) return current
      const next = { ...current }
      delete next[tabId]
      return next
    })
  }, [])

  const pushFindReplaceHistorySnapshot = useCallback((tabId, snapshot) => {
    if (!tabId || !snapshot) return

    setFindReplaceHistoryByTab((current) => {
      const previous = current[tabId] ?? { undoStack: [], redoStack: [] }
      const undoStack = [
        ...previous.undoStack,
        {
          content: String(snapshot.content ?? ''),
          selection: {
            start: Math.max(0, Number(snapshot.selection?.start) || 0),
            end: Math.max(0, Number(snapshot.selection?.end) || 0),
          },
        },
      ].slice(-FIND_REPLACE_HISTORY_LIMIT)

      return {
        ...current,
        [tabId]: {
          undoStack,
          redoStack: [],
        },
      }
    })
  }, [])

  const applyFindReplaceSnapshot = useCallback(
    (tabId, snapshot, direction) => {
      if (!tabId || !snapshot) return false
      const nextContent = String(snapshot.content ?? '')
      const nextSelection = {
        start: Math.max(0, Number(snapshot.selection?.start) || 0),
        end: Math.max(0, Number(snapshot.selection?.end) || 0),
      }

      setTabContentById(tabId, nextContent)
      setActiveSelectionRange(nextSelection, true)

      setFindReplaceHistoryByTab((current) => {
        const previous = current[tabId] ?? { undoStack: [], redoStack: [] }
        const currentSnapshot = {
          content: direction === 'undo' ? activeContent : activeContent,
          selection: {
            start: Math.max(0, Number(selectionRange.start) || 0),
            end: Math.max(0, Number(selectionRange.end) || 0),
          },
        }
        const limit = FIND_REPLACE_HISTORY_LIMIT
        if (direction === 'undo') {
          const undoStack = previous.undoStack.slice(0, -1)
          const redoStack = [...previous.redoStack, currentSnapshot].slice(-limit)
          return {
            ...current,
            [tabId]: {
              undoStack,
              redoStack,
            },
          }
        }

        const redoStack = previous.redoStack.slice(0, -1)
        const undoStack = [...previous.undoStack, currentSnapshot].slice(-limit)
        return {
          ...current,
          [tabId]: {
            undoStack,
            redoStack,
          },
        }
      })

      setFindStatusMessage('')
      return true
    },
    [activeContent, selectionRange.end, selectionRange.start, setActiveSelectionRange, setTabContentById],
  )

  const handleFindReplaceUndo = useCallback(() => {
    if (!activeTabId) return false
    const history = findReplaceHistoryByTab[activeTabId]
    if (!history?.undoStack?.length) return false

    const nextSnapshot = history.undoStack[history.undoStack.length - 1]
    return applyFindReplaceSnapshot(activeTabId, nextSnapshot, 'undo')
  }, [activeTabId, applyFindReplaceSnapshot, findReplaceHistoryByTab])

  const handleFindReplaceRedo = useCallback(() => {
    if (!activeTabId) return false
    const history = findReplaceHistoryByTab[activeTabId]
    if (!history?.redoStack?.length) return false

    const nextSnapshot = history.redoStack[history.redoStack.length - 1]
    return applyFindReplaceSnapshot(activeTabId, nextSnapshot, 'redo')
  }, [activeTabId, applyFindReplaceSnapshot, findReplaceHistoryByTab])

  const activateTab = useCallback((tabId) => {
    setWindowsSelectionContext(null)
    setActiveTabId(tabId)
  }, [])

  const rememberWindowsSelectionContext = useCallback((tabId, context) => {
    if (!tabId || !context) return
    setWindowsSelectionContextHistoryByTab((current) => ({
      ...current,
      [tabId]: {
        tabId,
        start: context.start,
        end: context.end,
        text: context.text,
        contentSnapshot: context.contentSnapshot,
      },
    }))
    setWindowsSelectionContext(null)
  }, [])

  const restoreWindowsSelectionContext = useCallback(
    (tabId) => {
      if (!isWindows || !tabId) return
      const rememberedContext = windowsSelectionContextHistoryByTab[tabId]
      if (!rememberedContext) return
      setWindowsSelectionContext(rememberedContext)
    },
    [isWindows, windowsSelectionContextHistoryByTab],
  )

  const hideWindowsSelectionContext = useCallback((tabId) => {
    if (!isWindows || !tabId) return
    setWindowsSelectionContext(null)
  }, [isWindows])

  const captureWindowsSelectionContext = useCallback(() => {
    if (!isWindows || !activeTabId) return

    const safeStart = Math.max(0, Math.min(activeSelectionStart, activeContent.length))
    const safeEnd = Math.max(safeStart, Math.min(activeSelectionEnd, activeContent.length))
    if (safeStart === safeEnd) {
      setWindowsSelectionContext(null)
      return
    }

    setWindowsSelectionContext({
      tabId: activeTabId,
      start: safeStart,
      end: safeEnd,
      text: activeContent.slice(safeStart, safeEnd),
      contentSnapshot: activeContent,
    })
  }, [activeContent, activeSelectionEnd, activeSelectionStart, activeTabId, isWindows])

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

    pushFindReplaceHistorySnapshot(activeTabId, {
      content: activeContent,
      selection: selectionRange,
    })

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
    activeSelectionEnd,
    activeSelectionStart,
    activeTabId,
    activeContent,
    findMatchRanges,
    findQuery,
    replaceQuery,
    pushFindReplaceHistorySnapshot,
    setActiveSelectionRange,
    setTabContentById,
    selectionRange,
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

    pushFindReplaceHistorySnapshot(activeTabId, {
      content: activeContent,
      selection: selectionRange,
    })

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
    pushFindReplaceHistorySnapshot,
    replaceQuery,
    setActiveSelectionRange,
    setTabContentById,
    selectionRange,
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
    onSelectionRangeConsumed: clearVisibleSelectionRange,
    onGenerationCursorChange: (tabId, nextCursorPosition) => {
      if (!tabId || !Number.isFinite(Number(nextCursorPosition))) return
      const safePosition = Math.max(0, Number(nextCursorPosition))
      setSelectionRangesByTab((currentRanges) => {
        const previousRange = currentRanges[tabId]
        const nextRange = { start: safePosition, end: safePosition }
        if (previousRange && previousRange.start === nextRange.start && previousRange.end === nextRange.end) {
          return currentRanges
        }
        return {
          ...currentRanges,
          [tabId]: nextRange,
        }
      })
    },
    onSelectionTargetConsumed: rememberWindowsSelectionContext,
    onSelectionTargetUndo: restoreWindowsSelectionContext,
    onSelectionTargetRedo: hideWindowsSelectionContext,
    selectedModel,
    selectionRange,
    selectionTarget: activeWindowsSelectionContext,
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
    () => normalizeCustomCheckboxLines(rawMdForPreview),
    [rawMdForPreview],
  )
  const renderedMarkdown = useMemo(
    () =>
      renderMarkdownToSafeHtml(normalizedPreviewMarkdown, {
        baseFilePath: activeTab?.filePath || '',
        checkboxLineIndexes,
        previewCheckboxMode: 'button',
      }),
    [activeTab?.filePath, checkboxLineIndexes, normalizedPreviewMarkdown],
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
    setPreviewOpenForTab(activeTabIdRef.current, Boolean(nextSettings.defaultStartupPreview))
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
  }, [setPreviewOpenForTab, setSelectedModel])

  // Toggle for showing/hiding MD prompts in preview/exports
  const handleToggleMdPrompts = useCallback(() => {
    setIsMdPromptsVisible((prev) => {
      const nextValue = !prev
      setSettings((current) => {
        const nextSettings = {
          ...current,
          defaultShowMdPrompts: nextValue,
        }
        if (isDesktopRuntime()) {
          void saveSettings(nextSettings)
        }
        return nextSettings
      })
      return nextValue
    })
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
        sessionKey: JSON.stringify({
          sessionTabs: Array.isArray(nextSettings.sessionTabs) ? nextSettings.sessionTabs : [],
          sessionActiveTabId: String(nextSettings.sessionActiveTabId || ''),
          sessionNextUntitledIndex: Number(nextSettings.sessionNextUntitledIndex || 2),
        }),
      }

      const sessionTabs = Array.isArray(nextSettings.sessionTabs) ? nextSettings.sessionTabs : []
      if (sessionTabs.length) {
        const restoredTabs = sessionTabs.map((tab, index) => {
          const fallbackTab = createNewTab(index + 1)
          return {
            ...fallbackTab,
            id: String(tab?.id || fallbackTab.id),
            title: String(tab?.title || fallbackTab.title),
            content: String(tab?.content || ''),
            filePath: String(tab?.filePath || ''),
            lastSavedContent: String(tab?.lastSavedContent || ''),
            isDirty: Boolean(tab?.isDirty),
          }
        })

        setTabs(restoredTabs)
        setSelectionRangesByTab(
          restoredTabs.reduce((acc, tab) => {
            acc[tab.id] = { start: 0, end: 0 }
            return acc
          }, {}),
        )
        setPreviewOpenByTab(
          restoredTabs.reduce((acc, tab, index) => {
            acc[tab.id] = Boolean(sessionTabs[index]?.isPreviewOpen)
            return acc
          }, {}),
        )
        setScrollPositionsByTab(
          restoredTabs.reduce((acc, tab) => {
            acc[tab.id] = createInitialScrollPosition()
            return acc
          }, {}),
        )

        const restoredActiveTab =
          restoredTabs.find((tab) => tab.id === String(nextSettings.sessionActiveTabId || '')) ?? restoredTabs[0]
        activateTab(restoredActiveTab.id)
        setHasLoadedDesktopSettings(true)
        return
      }

      const sessionSavedTabPaths = Array.isArray(nextSettings.sessionSavedTabPaths)
        ? nextSettings.sessionSavedTabPaths.filter(Boolean)
        : []
      if (sessionSavedTabPaths.length) {
        const restoredFiles = (await loadMarkdownFilesByPaths(sessionSavedTabPaths)).filter(
          (file) => !exceedsLoadFileSizeLimit(file?.content ?? ''),
        )
        if (restoredFiles.length) {
          const restoredTabs = restoredFiles.map((file) => {
            const base = createNewTab(1)
            const title = ensureMarkdownFileName(fileNameFromPath(file.path))

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
          setPreviewOpenByTab(
            restoredTabs.reduce((acc, tab) => {
              acc[tab.id] = tab.filePath === restoredActivePath ? Boolean(nextSettings.defaultStartupPreview) : false
              return acc
            }, {}),
          )

          const restoredActiveTab =
            restoredTabs.find((tab) => tab.filePath === restoredActivePath) ?? restoredTabs[0]
          activateTab(restoredActiveTab.id)
        }
      }

      setHasLoadedDesktopSettings(true)
    }

    void loadDesktopSettings()
  }, [activateTab, applySettings])

  useEffect(() => {
    if (!isDesktopRuntime()) return
    if (!hasLoadedDesktopSettings) return

    const sessionSavedTabPaths = tabs
      .map((tab) => tab.filePath?.trim() ?? '')
      .filter(Boolean)
    const activeTabPath = (tabs.find((tab) => tab.id === activeTabId)?.filePath ?? '').trim()
    const sessionTabs = getSessionSnapshotTabs(tabs)
    const sessionKey = JSON.stringify({
      sessionTabs,
      sessionActiveTabId: activeTabId ?? '',
      sessionNextUntitledIndex: nextUntitledIndexFromTabs,
    })

    const persistedPaths = Array.isArray(lastPersistedSessionRef.current.paths)
      ? lastPersistedSessionRef.current.paths
      : []
    const samePaths =
      persistedPaths.length === sessionSavedTabPaths.length &&
      persistedPaths.every((path, index) => path === sessionSavedTabPaths[index])
    const sameActivePath = (lastPersistedSessionRef.current.activePath || '').trim() === activeTabPath
    const sameSessionKey = (lastPersistedSessionRef.current.sessionKey || '') === sessionKey

    if (samePaths && sameActivePath && sameSessionKey) return

    lastPersistedSessionRef.current = {
      paths: sessionSavedTabPaths,
      activePath: activeTabPath,
      sessionKey,
    }

    void saveSettings({
      ...settings,
      sessionTabs,
      sessionActiveTabId: activeTabId ?? '',
      sessionNextUntitledIndex: nextUntitledIndexFromTabs,
      sessionSavedTabPaths,
      sessionActiveTabPath: activeTabPath,
    })
  }, [activeTabId, getSessionSnapshotTabs, hasLoadedDesktopSettings, nextUntitledIndexFromTabs, settings, tabs])

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
    const nextTab = createNewTab(nextUntitledIndexFromTabs)
    if (isPreviewOpen && activeTabId) {
      const livePreviewScrollTop = Number(previewContentRef.current?.scrollTop)
      const livePreviewScrollHeight = Number(previewContentRef.current?.scrollHeight)
      const livePreviewClientHeight = Number(previewContentRef.current?.clientHeight)
      setScrollPositionsByTab((currentPositions) => {
        const previous = currentPositions[activeTabId] ?? createInitialScrollPosition()
        const nextPreviewTop = Number.isFinite(livePreviewScrollTop)
          ? Math.max(0, livePreviewScrollTop)
          : Number.isFinite(previewScrollTopRef.current)
            ? Math.max(0, previewScrollTopRef.current)
            : previous.previewTop
        const nextPreviewScrollHeight = Number.isFinite(livePreviewScrollHeight)
          ? Math.max(0, livePreviewScrollHeight)
          : previous.previewScrollHeight
        const nextPreviewClientHeight = Number.isFinite(livePreviewClientHeight)
          ? Math.max(0, livePreviewClientHeight)
          : previous.previewClientHeight
        const nextEditorTop = mapScrollTopBetweenRanges({
          sourceTop: nextPreviewTop,
          sourceScrollHeight: nextPreviewScrollHeight,
          sourceClientHeight: nextPreviewClientHeight,
          targetScrollHeight: previous.editorScrollHeight,
          targetClientHeight: previous.editorClientHeight,
        })

        if (
          Math.abs(previous.editorTop - nextEditorTop) < 1 &&
          Math.abs(previous.previewTop - nextPreviewTop) < 1 &&
          Math.abs((previous.previewScrollHeight ?? 0) - nextPreviewScrollHeight) < 1 &&
          Math.abs((previous.previewClientHeight ?? 0) - nextPreviewClientHeight) < 1
        ) {
          return currentPositions
        }

        const nextPositions = {
          ...currentPositions,
          [activeTabId]: {
            ...previous,
            editorTop: nextEditorTop,
            previewTop: nextPreviewTop,
            previewScrollHeight: nextPreviewScrollHeight,
            previewClientHeight: nextPreviewClientHeight,
          },
        }
        scrollPositionsByTabRef.current = nextPositions
        return nextPositions
      })
    }
    setTabs((currentTabs) => [...currentTabs, nextTab])
    setSelectionRangesByTab((currentRanges) => ({
      ...currentRanges,
      [nextTab.id]: { start: 0, end: 0 },
    }))
    setScrollPositionsByTab((currentPositions) => ({
      ...currentPositions,
      [nextTab.id]: createInitialScrollPosition(),
    }))
    setPreviewOpenByTab((currentStates) => ({
      ...currentStates,
      [nextTab.id]: false,
    }))
    setWindowsSelectionContext(null)
    setWindowsSelectionContextHistoryByTab((current) => {
      const next = { ...current }
      delete next[nextTab.id]
      return next
    })
    activateTab(nextTab.id)
    return nextTab
  }, [activateTab, activeTabId, isPreviewOpen, nextUntitledIndexFromTabs])

  const handleNew = useCallback(() => {
    createAndActivateTab()
    setFooterActionFeedback({ action: 'new', message: 'New document created' })
  }, [createAndActivateTab])

  useEffect(() => {
    if (!footerActionFeedback) return undefined

    if (footerActionFeedbackTimeoutRef.current) {
      clearTimeout(footerActionFeedbackTimeoutRef.current)
    }

    footerActionFeedbackTimeoutRef.current = window.setTimeout(() => {
      setFooterActionFeedback(null)
      footerActionFeedbackTimeoutRef.current = null
    }, FOOTER_ACTION_FEEDBACK_DURATION_MS)

    return () => {
      if (footerActionFeedbackTimeoutRef.current) {
        clearTimeout(footerActionFeedbackTimeoutRef.current)
        footerActionFeedbackTimeoutRef.current = null
      }
    }
  }, [footerActionFeedback])

  const handleDuplicate = useCallback(() => {
    if (!activeTab) return

    const baseDuplicateTab = createNewTab(1)
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
    activateTab(duplicateTab.id)
    setSelectionRangesByTab((currentRanges) => ({
      ...currentRanges,
      [duplicateTab.id]: { start: 0, end: 0 },
    }))
    setScrollPositionsByTab((currentPositions) => ({
      ...currentPositions,
      [duplicateTab.id]: {
        ...createInitialScrollPosition(),
        ...currentPositions[activeTab.id],
      },
    }))
    setPreviewOpenByTab((currentStates) => ({
      ...currentStates,
      [duplicateTab.id]: isPreviewOpen,
    }))
    setWindowsSelectionContext(null)
    setWindowsSelectionContextHistoryByTab((current) => {
      const next = { ...current }
      delete next[duplicateTab.id]
      return next
    })
  }, [activeTab, activateTab, isPreviewOpen])

  const handleRename = useCallback(async () => {
    if (!activeTabId) return

    if (isDesktopRuntime() && !activeTab?.filePath) {
      await saveAsActionRef.current?.()
      return
    }

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

  const closeTabsInState = useCallback(
    (tabsToClose = [], tabsSnapshot = tabs) => {
      if (!tabsToClose.length) return

      const tabIdsToClose = new Set(tabsToClose.map((tab) => tab.id).filter(Boolean))
      if (!tabIdsToClose.size) return

      const nextTabs = tabsSnapshot.filter((tab) => !tabIdsToClose.has(tab.id))

      setSelectionRangesByTab((currentRanges) => {
        const nextRanges = { ...currentRanges }
        tabIdsToClose.forEach((tabId) => {
          delete nextRanges[tabId]
        })
        return nextRanges
      })
      setScrollPositionsByTab((currentPositions) => {
        const nextPositions = { ...currentPositions }
        tabIdsToClose.forEach((tabId) => {
          delete nextPositions[tabId]
        })
        return nextPositions
      })
      setWindowsSelectionContextHistoryByTab((current) => {
        const nextHistory = { ...current }
        tabIdsToClose.forEach((tabId) => {
          delete nextHistory[tabId]
        })
        return nextHistory
      })
      setPreviewOpenByTab((currentStates) => {
        const nextStates = { ...currentStates }
        tabIdsToClose.forEach((tabId) => {
          delete nextStates[tabId]
        })
        return nextStates
      })

      const activeTabWasClosed = activeTabId ? tabIdsToClose.has(activeTabId) : false
      if (activeTabWasClosed) {
        setWindowsSelectionContext(null)
      }
      if (!nextTabs.length) {
        const replacementTab = createNewTab(1)
        setTabs([replacementTab])
        setSelectionRangesByTab({
          [replacementTab.id]: { start: 0, end: 0 },
        })
        setScrollPositionsByTab({
          [replacementTab.id]: createInitialScrollPosition(),
        })
        setPreviewOpenByTab({
          [replacementTab.id]: false,
        })
        setWindowsSelectionContext(null)
        setWindowsSelectionContextHistoryByTab({})
        setActiveTabId(replacementTab.id)
        return
      }

      setTabs(nextTabs)
      if (!activeTabWasClosed) return

      const closedIndexes = tabsToClose
        .map((tab) => tabsSnapshot.findIndex((candidate) => candidate.id === tab.id))
        .filter((index) => index >= 0)
      const fallbackIndex =
        closedIndexes.length > 0
          ? Math.min(...closedIndexes)
          : tabsSnapshot.findIndex((tab) => tab.id === activeTabId)
      const nextActiveTab = nextTabs[fallbackIndex] ?? nextTabs[fallbackIndex - 1] ?? nextTabs[nextTabs.length - 1]
      activateTab(nextActiveTab.id)
    },
    [activeTabId, activateTab, tabs],
  )

  const handleCloseTab = useCallback(
    async (tabId) => {
      const tabToClose = tabs.find((tab) => tab.id === tabId)
      if (!tabToClose) return

      if (!tabNeedsDirtyClosePrompt(tabToClose)) {
        if (isLoadingPrompt && tabId === activeTabId) {
          abortGeneration()
        }
        closeTabsInState([tabToClose], tabs)
        return
      }

      const canClose = await confirmSafeToCloseTabs([tabToClose])
      if (!canClose) {
        return
      }

      if (isLoadingPrompt && tabId === activeTabId) {
        abortGeneration()
      }

      closeTabsInState([tabToClose], tabs)
    },
    [abortGeneration, activeTabId, closeTabsInState, confirmSafeToCloseTabs, isLoadingPrompt, tabNeedsDirtyClosePrompt, tabs],
  )

  const handleCloseAllTabs = useCallback(async () => {
    if (!tabs.length) return

    const tabsNeedingPrompt = tabs.filter((tab) => tabNeedsDirtyClosePrompt(tab))
    if (!tabsNeedingPrompt.length) {
      if (isLoadingPrompt) {
        abortGeneration()
      }
      closeTabsInState(tabs, tabs)
      resetGenerationState()
      return
    }

    if (isLoadingPrompt) {
      abortGeneration()
    }

    const canCloseAll = await confirmSafeToCloseTabs(tabs)
    if (!canCloseAll) {
      return
    }

    closeTabsInState(tabs, tabs)
    resetGenerationState()
  }, [abortGeneration, closeTabsInState, confirmSafeToCloseTabs, isLoadingPrompt, resetGenerationState, tabNeedsDirtyClosePrompt, tabs])

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
        setFooterActionFeedback({ action: 'save', message: 'Saved' })
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
      setFooterActionFeedback({ action: 'save', message: 'Saved' })
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
    setFooterActionFeedback({ action: 'save', message: 'Saved' })
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
    setAlreadyOpenTab(null)
    if (isDesktopRuntime()) {
      const openedFile = await openMarkdownWithNativeDialog()
      if (!openedFile) return

      const path = typeof openedFile.path === 'string' ? openedFile.path.trim() : ''
      const loadedContent = typeof openedFile.content === 'string' ? openedFile.content : ''
      if (!path) {
        setPromptError('Unable to open the selected file.')
        return
      }
      const existingTab = findTabByFilePath(path)
      if (existingTab) {
        setAlreadyOpenTab(existingTab)
        return
      }
      if (exceedsLoadFileSizeLimit(loadedContent)) {
        setPromptError(FILE_TOO_LARGE_MESSAGE)
        return
      }

      const fileTitle = ensureMarkdownFileName(fileNameFromPath(path))
      const nextTab = {
        ...createNewTab(1),
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
        setTabs((currentTabs) => [...currentTabs, nextTab])
        activateTab(nextTab.id)
      }

      const targetTabId = shouldReplaceEmptyUntitledActiveTab && activeTabId ? activeTabId : nextTab.id
      setSelectionRangesByTab((currentRanges) => ({
        ...currentRanges,
        [targetTabId]: { start: 0, end: 0 },
      }))
      setScrollPositionsByTab((currentPositions) => ({
        ...currentPositions,
        [targetTabId]: createInitialScrollPosition(),
      }))
      if (!(shouldReplaceEmptyUntitledActiveTab && activeTabId)) {
        setPreviewOpenByTab((currentStates) => ({
          ...currentStates,
          [targetTabId]: false,
        }))
      }
      resetGenerationState({ tabId: targetTabId })
      setPromptError('')
      setFooterActionFeedback({ action: 'load', message: 'Loaded' })
      return
    }

    fileInputRef.current?.click()
  }, [
    activeTabId,
    activateTab,
    findTabByFilePath,
    resetGenerationState,
    setAlreadyOpenTab,
    setFooterActionFeedback,
    setPreviewOpenByTab,
    setPromptError,
    setSelectionRangesByTab,
    setScrollPositionsByTab,
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
          ...createNewTab(1),
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
          setTabs((currentTabs) => [...currentTabs, nextTab])
          activateTab(nextTab.id)
        }

        setSelectionRangesByTab((currentRanges) => ({
          ...currentRanges,
          [targetTabId]: { start: 0, end: 0 },
        }))
        setScrollPositionsByTab((currentPositions) => ({
          ...currentPositions,
          [targetTabId]: createInitialScrollPosition(),
        }))
        if (!(shouldReplaceEmptyUntitledActiveTab && activeTabId)) {
          setPreviewOpenByTab((currentStates) => ({
            ...currentStates,
            [targetTabId]: false,
          }))
        }
        resetGenerationState({ tabId: targetTabId })
        setFooterActionFeedback({ action: 'load', message: 'Loaded' })
      }
      reader.onerror = () => {
        setPromptError('Unable to read the selected file.')
      }
      reader.readAsText(file)
      event.target.value = ''
    },
    [
      activeTabId,
      resetGenerationState,
      setPromptError,
      shouldReplaceEmptyUntitledActiveTab,
      activateTab,
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
        ...createNewTab(1),
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
        setTabs((currentTabs) => [...currentTabs, nextTab])
        activateTab(nextTab.id)
      }

      setSelectionRangesByTab((currentRanges) => ({
        ...currentRanges,
        [targetTabId]: { start: 0, end: 0 },
      }))
      setScrollPositionsByTab((currentPositions) => ({
        ...currentPositions,
        [targetTabId]: createInitialScrollPosition(),
      }))
      if (!(shouldReplaceEmptyUntitledActiveTab && activeTabId)) {
        setPreviewOpenByTab((currentStates) => ({
          ...currentStates,
          [targetTabId]: false,
        }))
      }
      resetGenerationState({ tabId: targetTabId })
      setPromptError('')
    },
    [
      activeTabId,
      resetGenerationState,
      setPromptError,
      shouldReplaceEmptyUntitledActiveTab,
      activateTab,
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
      setFooterActionFeedback({ action: 'copy', message: 'Copied' })
    } catch (error) {
      setPromptError(error?.message ?? 'Unable to copy text to the clipboard.')
    }
  }, [activeContent, selectionRange.end, selectionRange.start, setPromptError])

  const handlePrintClick = useCallback(() => {
    if (!activeTab) return
    printRenderedMarkdown(activeContent, isMdPromptsVisible)
  }, [activeContent, activeTab, isMdPromptsVisible])

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
      const scrollHeight = Number(payload.scrollHeight)
      const clientHeight = Number(payload.clientHeight)
      const nextTop = Number.isFinite(scrollTop) ? Math.max(0, scrollTop) : 0
      const nextScrollHeight = Number.isFinite(scrollHeight) ? Math.max(0, scrollHeight) : 0
      const nextClientHeight = Number.isFinite(clientHeight) ? Math.max(0, clientHeight) : 0
      setScrollPositionsByTab((currentPositions) => {
        const previous = currentPositions[activeTabId] ?? createInitialScrollPosition()
        const shouldInvalidatePreviewPosition = !isPreviewOpen
        const nextPreviewTop = shouldInvalidatePreviewPosition ? 0 : previous.previewTop
        const nextPreviewScrollHeight = shouldInvalidatePreviewPosition ? 0 : previous.previewScrollHeight
        const nextPreviewClientHeight = shouldInvalidatePreviewPosition ? 0 : previous.previewClientHeight
        if (
          Math.abs(previous.editorTop - nextTop) < 1 &&
          Math.abs((previous.editorScrollHeight ?? 0) - nextScrollHeight) < 1 &&
          Math.abs((previous.editorClientHeight ?? 0) - nextClientHeight) < 1 &&
          Math.abs((previous.previewTop ?? 0) - nextPreviewTop) < 1 &&
          Math.abs((previous.previewScrollHeight ?? 0) - nextPreviewScrollHeight) < 1 &&
          Math.abs((previous.previewClientHeight ?? 0) - nextPreviewClientHeight) < 1
        ) {
          return currentPositions
        }
        const nextPositions = {
          ...currentPositions,
          [activeTabId]: {
            ...previous,
            editorTop: nextTop,
            editorScrollHeight: nextScrollHeight,
            editorClientHeight: nextClientHeight,
            previewTop: nextPreviewTop,
            previewScrollHeight: nextPreviewScrollHeight,
            previewClientHeight: nextPreviewClientHeight,
          },
        }
        scrollPositionsByTabRef.current = nextPositions
        return nextPositions
      })
    },
    [activeTabId, isPreviewOpen],
  )

  const handlePreviewCheckboxToggleByLine = useCallback(
    (sourceLine, nextChecked) => {
      if (!Number.isInteger(sourceLine) || !activeTabId) return

      setTabs((currentTabs) => {
        const targetTab = currentTabs.find((tab) => tab.id === activeTabId)
        if (!targetTab) return currentTabs

        const nextContent = toggleCheckboxOnLine(targetTab.content, sourceLine, nextChecked)
        return updateTabContent(currentTabs, activeTabId, nextContent)
      })
    },
    [activeTabId],
  )

  const handlePreviewCheckboxToggle = useCallback(
    (checkbox, explicitChecked = null) => {
      if (!(checkbox instanceof HTMLElement) || !activeTabId) return
      let sourceLine = Number(checkbox.dataset.sourceLine)
      if (!Number.isInteger(sourceLine) && previewContentRef.current) {
        const checkboxNodes = [
          ...previewContentRef.current.querySelectorAll(
            '[data-preview-checkbox="true"], [data-preview-checkbox-anchor="true"]',
          ),
        ]
        const checkboxIndex = checkboxNodes.indexOf(checkbox)
        if (checkboxIndex >= 0) {
          sourceLine = checkboxLineIndexes[checkboxIndex]
        }
      }

      if (!Number.isInteger(sourceLine)) return
      const nextChecked =
        typeof explicitChecked === 'boolean'
          ? explicitChecked
          : checkbox.getAttribute('aria-pressed') !== 'true'
      const taskItem = checkbox.closest?.('[data-preview-task-item="true"]')

      if (checkbox.getAttribute('data-preview-checkbox-anchor') === 'true') {
        checkbox.dataset.checked = nextChecked ? 'true' : 'false'
      }
      if (taskItem instanceof HTMLElement) {
        taskItem.dataset.checked = nextChecked ? 'true' : 'false'
      }

      handlePreviewCheckboxToggleByLine(sourceLine, nextChecked)
    },
    [activeTabId, checkboxLineIndexes, handlePreviewCheckboxToggleByLine],
  )

  const handlePreviewLinkClick = useCallback((event, href) => {
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
  }, [])

  const handlePreviewContentClick = useCallback(
    (event) => {
      const targetElement = getPreviewEventTargetElement(event.target)

      if (!isWindows) {
        const checkbox = targetElement?.closest?.('[data-preview-checkbox="true"]')
        if (checkbox instanceof HTMLButtonElement) {
          event.preventDefault()
          event.stopPropagation()
          handlePreviewCheckboxToggle(checkbox)
          return
        }
      }

      const anchor = targetElement?.closest?.('a[href]')
      if (anchor instanceof HTMLAnchorElement) {
        handlePreviewLinkClick(event, anchor.getAttribute('href') || '')
        return
      }
    },
    [handlePreviewCheckboxToggle, handlePreviewLinkClick, isWindows],
  )

  const renderedWindowsPreviewContent = useMemo(() => {
    if (!isWindows) return null
    return renderWindowsPreviewReactContent(renderedMarkdown, {
      onCheckboxToggle: (sourceLine, nextChecked) => {
        handlePreviewCheckboxToggleByLine(sourceLine, nextChecked)
      },
      onLinkClick: handlePreviewLinkClick,
    })
  }, [handlePreviewCheckboxToggleByLine, handlePreviewLinkClick, isWindows, renderedMarkdown])

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
        setPreviewOpenForTab(activeTabId, Boolean(value))
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
    [activeTabId, setPreviewOpenForTab, setSelectedModel],
  )

  const syncPreviewScrollBackToEditor = useCallback(() => {
    if (!activeTabId) return
    const livePreviewScrollTop = Number(previewContentRef.current?.scrollTop)
    const livePreviewScrollHeight = Number(previewContentRef.current?.scrollHeight)
    const livePreviewClientHeight = Number(previewContentRef.current?.clientHeight)
    setScrollPositionsByTab((currentPositions) => {
      const previous = currentPositions[activeTabId] ?? createInitialScrollPosition()
      const nextPreviewTop = Number.isFinite(livePreviewScrollTop)
        ? Math.max(0, livePreviewScrollTop)
        : Number.isFinite(previewScrollTopRef.current)
          ? Math.max(0, previewScrollTopRef.current)
          : previous.previewTop
      const nextPreviewScrollHeight = Number.isFinite(livePreviewScrollHeight)
        ? Math.max(0, livePreviewScrollHeight)
        : previous.previewScrollHeight
      const nextPreviewClientHeight = Number.isFinite(livePreviewClientHeight)
        ? Math.max(0, livePreviewClientHeight)
        : previous.previewClientHeight
      const nextEditorTop = mapScrollTopBetweenRanges({
        sourceTop: nextPreviewTop,
        sourceScrollHeight: nextPreviewScrollHeight,
        sourceClientHeight: nextPreviewClientHeight,
        targetScrollHeight: previous.editorScrollHeight,
        targetClientHeight: previous.editorClientHeight,
      })

      if (
        Math.abs(previous.editorTop - nextEditorTop) < 1 &&
        Math.abs(previous.previewTop - nextPreviewTop) < 1 &&
        Math.abs((previous.previewScrollHeight ?? 0) - nextPreviewScrollHeight) < 1 &&
        Math.abs((previous.previewClientHeight ?? 0) - nextPreviewClientHeight) < 1
      ) {
        return currentPositions
      }
      const nextPositions = {
        ...currentPositions,
        [activeTabId]: {
          ...previous,
          editorTop: nextEditorTop,
          previewTop: nextPreviewTop,
          previewScrollHeight: nextPreviewScrollHeight,
          previewClientHeight: nextPreviewClientHeight,
        },
      }
      scrollPositionsByTabRef.current = nextPositions
      return nextPositions
    })
  }, [activeTabId])

  const syncPreviewScrollForTabSwitch = useCallback(() => {
    if (!activeTabId) return
    const livePreviewScrollTop = Number(previewContentRef.current?.scrollTop)
    const livePreviewScrollHeight = Number(previewContentRef.current?.scrollHeight)
    const livePreviewClientHeight = Number(previewContentRef.current?.clientHeight)
    const currentPositions = scrollPositionsByTabRef.current
    const previous = currentPositions[activeTabId] ?? createInitialScrollPosition()
    const nextPreviewTop = Number.isFinite(livePreviewScrollTop)
      ? Math.max(0, livePreviewScrollTop)
      : Number.isFinite(previewScrollTopRef.current)
        ? Math.max(0, previewScrollTopRef.current)
        : previous.previewTop
    const nextPreviewScrollHeight = Number.isFinite(livePreviewScrollHeight)
      ? Math.max(0, livePreviewScrollHeight)
      : previous.previewScrollHeight
    const nextPreviewClientHeight = Number.isFinite(livePreviewClientHeight)
      ? Math.max(0, livePreviewClientHeight)
      : previous.previewClientHeight
    const nextEditorTop = mapScrollTopBetweenRanges({
      sourceTop: nextPreviewTop,
      sourceScrollHeight: nextPreviewScrollHeight,
      sourceClientHeight: nextPreviewClientHeight,
      targetScrollHeight: previous.editorScrollHeight,
      targetClientHeight: previous.editorClientHeight,
    })

    if (
      Math.abs(previous.editorTop - nextEditorTop) < 1 &&
      Math.abs(previous.previewTop - nextPreviewTop) < 1 &&
      Math.abs((previous.previewScrollHeight ?? 0) - nextPreviewScrollHeight) < 1 &&
      Math.abs((previous.previewClientHeight ?? 0) - nextPreviewClientHeight) < 1
    ) {
      return
    }

    const nextPositions = {
      ...currentPositions,
      [activeTabId]: {
        ...previous,
        editorTop: nextEditorTop,
        previewTop: nextPreviewTop,
        previewScrollHeight: nextPreviewScrollHeight,
        previewClientHeight: nextPreviewClientHeight,
      },
    }
    scrollPositionsByTabRef.current = nextPositions
    setScrollPositionsByTab(nextPositions)
  }, [activeTabId])

  const switchActiveTab = useCallback(
    (tabId, { clearWindowsSelection = false } = {}) => {
      if (!tabId) return
      if (isPreviewOpen) {
        syncPreviewScrollForTabSwitch()
      }
      if (clearWindowsSelection) {
        setWindowsSelectionContext(null)
      }
      setActiveTabId(tabId)
    },
    [isPreviewOpen, setActiveTabId, setWindowsSelectionContext, syncPreviewScrollForTabSwitch]
  )

  const handleTabSelect = useCallback(
    (tabId) => {
      switchActiveTab(tabId, { clearWindowsSelection: true })
    },
    [switchActiveTab]
  )

  const handleConfirmAlreadyOpen = useCallback(() => {
    if (!alreadyOpenTab) return
    switchActiveTab(alreadyOpenTab.id, { clearWindowsSelection: true })
    setAlreadyOpenTab(null)
  }, [alreadyOpenTab, setAlreadyOpenTab, switchActiveTab])


  const syncPreviewCheckboxesToMarkdown = useCallback(() => {
    if (!activeTabId) return
    const previewElement = previewContentRef.current
    if (!previewElement) return

    const checkboxNodes = [
      ...previewElement.querySelectorAll('[data-preview-checkbox="true"], [data-preview-checkbox-anchor="true"]'),
    ]
    if (!checkboxNodes.length) return

    setTabs((currentTabs) => {
      const targetTab = currentTabs.find((tab) => tab.id === activeTabId)
      if (!targetTab) return currentTabs

      let nextContent = targetTab.content

      checkboxNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return
        const sourceLine = Number(node.dataset.sourceLine)
        if (!Number.isInteger(sourceLine)) return

        const isChecked =
          node instanceof HTMLInputElement
            ? node.checked
            : node.getAttribute('data-preview-checkbox-anchor') === 'true'
              ? node.dataset.checked === 'true'
              : node.getAttribute('aria-pressed') === 'true'
        const updatedContent = toggleCheckboxOnLine(nextContent, sourceLine, isChecked)
        if (updatedContent !== nextContent) {
          nextContent = updatedContent
        }
      })

      if (nextContent === targetTab.content) return currentTabs
      return updateTabContent(currentTabs, activeTabId, nextContent)
    })
  }, [activeTabId])

  const handleShowPreview = useCallback(() => {
    setPreviewOpenForTab(activeTabId, true)
  }, [activeTabId, setPreviewOpenForTab])

  const handleShowTextEdit = useCallback(() => {
    syncPreviewCheckboxesToMarkdown()
    syncPreviewScrollBackToEditor()
    setPreviewOpenForTab(activeTabId, false)
  }, [activeTabId, setPreviewOpenForTab, syncPreviewCheckboxesToMarkdown, syncPreviewScrollBackToEditor])

  const handleTogglePreview = useCallback(() => {
    if (isPreviewOpen) {
      syncPreviewCheckboxesToMarkdown()
      syncPreviewScrollBackToEditor()
    }
    setPreviewOpenForTab(activeTabId, (previous) => !previous)
  }, [activeTabId, isPreviewOpen, setPreviewOpenForTab, syncPreviewCheckboxesToMarkdown, syncPreviewScrollBackToEditor])

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

  const handleRequestAppQuit = useCallback(async () => {
    const canQuit = await confirmSafeToCloseTabs(tabs)
    if (!canQuit) {
      return false
    }
    if (isLoadingPrompt) {
      abortGeneration()
    }

    return exitApp()
  }, [abortGeneration, confirmSafeToCloseTabs, isLoadingPrompt, tabs])

  const handleRequestWindowClose = useCallback(async () => {
    const canClose = await confirmSafeToCloseTabs(tabs)
    if (!canClose) {
      return false
    }
    if (isLoadingPrompt) {
      abortGeneration()
    }

    return closeCurrentWindow()
  }, [abortGeneration, confirmSafeToCloseTabs, isLoadingPrompt, tabs])

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
    handleShowTextEdit()
    setIsFindReplaceOpen(true)
  }, [activeContent, activeTabId, handleShowTextEdit, selectionRange.end, selectionRange.start])

  const handleCloseFindReplace = useCallback(() => {
    setIsFindReplaceOpen(false)
    setFindStatusMessage('')
    setEditorFocusRequestId((current) => current + 1)
  }, [])

  const handleShowAutoSave = useCallback(() => {
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
    const body = renderMarkdownToSafeHtml(exportMarkdownSource, {
      baseFilePath: activeTab?.filePath || '',
    })
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
  }, [activeTab?.filePath, activeTab?.title, exportMarkdownSource])

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
    const suggestedName = `${getExportBaseName()}.pdf`
    await exportRenderedMarkdownAsPdf(exportMarkdownSource, isMdPromptsVisible, suggestedName)
  }, [exportMarkdownSource, getExportBaseName, isMdPromptsVisible])

  const handleExportRtf = useCallback(async () => {
    const rtfContent = buildPlainTextRtfDocument(exportMarkdownSource)
    await exportWithNativeDialog({
      content: rtfContent,
      extension: 'rtf',
      filterName: 'RTF',
    })
  }, [exportMarkdownSource, exportWithNativeDialog])

  const handleExportWord = useCallback(async () => {
    await exportWithNativeDialog({
      content: exportHtmlDocument,
      extension: 'html',
      filterName: 'Word-Compatible HTML',
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
    onDuplicate: handleDuplicate,
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
    if (!isPreviewOpen || isWindows) return undefined
    const previewElement = previewContentRef.current
    if (!previewElement) return undefined

    // Use native event delegation for injected preview HTML so desktop webviews
    // do not depend on React's synthetic event bridge for checkbox/link clicks.
    const handlePreviewClick = (event) => {
      handlePreviewContentClick(event)
    }

    previewElement.addEventListener('click', handlePreviewClick)
    return () => {
      previewElement.removeEventListener('click', handlePreviewClick)
    }
  }, [handlePreviewContentClick, isPreviewOpen, isWindows])


  useEffect(() => {
    if (!isPreviewOpen) return
    const previewElement = previewContentRef.current
    if (!previewElement || !activeTabId) return

    const positions = scrollPositionsByTabRef.current[activeTabId] ?? createInitialScrollPosition()
    const nextScrollTop =
      Number.isFinite(positions.previewTop) && positions.previewTop > 0
        ? positions.previewTop
        : mapScrollTopBetweenRanges({
            sourceTop: positions.editorTop,
            sourceScrollHeight: positions.editorScrollHeight,
            sourceClientHeight: positions.editorClientHeight,
            targetScrollHeight: previewElement.scrollHeight,
            targetClientHeight: previewElement.clientHeight,
          })
    previewElement.scrollTop = Math.max(0, Number(nextScrollTop) || 0)
    previewScrollTopRef.current = previewElement.scrollTop
  }, [activeTabId, isPreviewOpen])

  useEffect(() => {
    if (!isWindows || !isPreviewOpen) return undefined

    return () => {
      syncPreviewScrollBackToEditor()
    }
  }, [isPreviewOpen, isWindows, syncPreviewScrollBackToEditor])

  useEffect(() => {
    if (!isPreviewOpen || !activeTabId) return undefined
    const previewElement = previewContentRef.current
    if (!previewElement) return undefined

    const handlePreviewScroll = () => {
      const nextTop = Math.max(0, Number(previewElement.scrollTop) || 0)
      const nextScrollHeight = Math.max(0, Number(previewElement.scrollHeight) || 0)
      const nextClientHeight = Math.max(0, Number(previewElement.clientHeight) || 0)
      previewScrollTopRef.current = nextTop
      const currentPositions = scrollPositionsByTabRef.current
      const previous = currentPositions[activeTabId] ?? createInitialScrollPosition()
      const nextEditorTop = mapScrollTopBetweenRanges({
        sourceTop: nextTop,
        sourceScrollHeight: nextScrollHeight,
        sourceClientHeight: nextClientHeight,
        targetScrollHeight: previous.editorScrollHeight,
        targetClientHeight: previous.editorClientHeight,
      })
      if (
        Math.abs(previous.editorTop - nextEditorTop) >= 1 ||
        Math.abs(previous.previewTop - nextTop) >= 1 ||
        Math.abs((previous.previewScrollHeight ?? 0) - nextScrollHeight) >= 1 ||
        Math.abs((previous.previewClientHeight ?? 0) - nextClientHeight) >= 1
      ) {
        scrollPositionsByTabRef.current = {
          ...currentPositions,
          [activeTabId]: {
            ...previous,
            editorTop: nextEditorTop,
            previewTop: nextTop,
            previewScrollHeight: nextScrollHeight,
            previewClientHeight: nextClientHeight,
          },
        }
      }
      if (isWindows) return
      if (isPreviewScrollTickingRef.current) return

      isPreviewScrollTickingRef.current = true
      requestAnimationFrame(() => {
        isPreviewScrollTickingRef.current = false
        setScrollPositionsByTab((currentPositions) => {
          const previous = currentPositions[activeTabId] ?? createInitialScrollPosition()
          if (
            Math.abs(previous.editorTop - nextEditorTop) < 1 &&
            Math.abs(previous.previewTop - nextTop) < 1 &&
            Math.abs((previous.previewScrollHeight ?? 0) - nextScrollHeight) < 1 &&
            Math.abs((previous.previewClientHeight ?? 0) - nextClientHeight) < 1
          ) {
            return currentPositions
          }

          const nextPositions = {
            ...currentPositions,
            [activeTabId]: {
              ...previous,
              editorTop: nextEditorTop,
              previewTop: nextTop,
              previewScrollHeight: nextScrollHeight,
              previewClientHeight: nextClientHeight,
            },
          }
          scrollPositionsByTabRef.current = nextPositions
          return nextPositions
        })
      })
    }

    previewElement.addEventListener('scroll', handlePreviewScroll)
    return () => {
      previewElement.removeEventListener('scroll', handlePreviewScroll)
    }
  }, [activeTabId, isPreviewOpen, isWindows])

  useEffect(() => {
    if (!isPreviewOpen) return undefined

    const handleEscapeKey = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      handleShowTextEdit()
    }

    window.addEventListener('keydown', handleEscapeKey)
    return () => {
      window.removeEventListener('keydown', handleEscapeKey)
    }
  }, [handleShowTextEdit, isPreviewOpen])

  useEffect(() => {
    if (!isDesktopRuntime()) return undefined

    let disposed = false
    let unlistenQuit = () => {}
    let unlistenClose = () => {}

    const registerListeners = async () => {
      unlistenQuit = await listenDesktopEvent('ghost-writer://menu-request-quit', async () => {
        if (disposed) return
        await handleRequestAppQuit()
      })
      unlistenClose = await listenDesktopEvent('ghost-writer://window-close-requested', async () => {
        if (disposed) return
        await handleRequestWindowClose()
      })
    }

    void registerListeners()

    return () => {
      disposed = true
      unlistenQuit()
      unlistenClose()
    }
  }, [handleRequestAppQuit, handleRequestWindowClose])

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
              {isWindows ? (
                <div ref={previewContentRef} className="preview__content">
                  {renderedWindowsPreviewContent}
                </div>
              ) : (
                <div
                  ref={previewContentRef}
                  className="preview__content"
                  dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
                />
              )}
            </section>
          ) : (
          <Editor
            value={activeContent}
            onChange={(nextValue) => {
              if (!activeTabId) return
              clearFindReplaceHistoryForTab(activeTabId)
              setTabContentById(activeTabId, nextValue)
            }}
            onPromptOpen={handlePromptOpen}
            onSelectionChange={handleSelectionChange}
            onSystemUndo={handleFindReplaceUndo}
            onSystemRedo={handleFindReplaceRedo}
            onScrollPositionChange={handleEditorScrollPositionChange}
            selectionRange={selectionRange}
              showSelectionOverlay={isPromptFocused && !isWindows}
              spellCheckEnabled={isSpellCheckEnabled}
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
            onPromptFocus={captureWindowsSelectionContext}
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
            selectionContext={activeWindowsSelectionContext}
            handleClearSelectionContext={clearWindowsSelectionContext}
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
        footerActionFeedback={footerActionFeedback}
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
        alreadyOpenTab={alreadyOpenTab}
        onConfirmAlreadyOpen={handleConfirmAlreadyOpen}
        dirtyCloseConfirmTab={dirtyCloseConfirmTab}
        onConfirmDirtyCloseSave={() => resolveDirtyCloseConfirm('save')}
        onConfirmDirtyCloseDiscard={() => resolveDirtyCloseConfirm('discard')}
        onCancelDirtyCloseConfirm={() => resolveDirtyCloseConfirm('cancel')}
        onExportDiagnostics={() => {
          void handleExportDiagnostics()
        }}
      />
    </div>
  )
}

export default App
