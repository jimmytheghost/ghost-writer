import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { stripAssistantLeadIn } from '../lib/contentTransforms'
import {
  buildOllamaUrl,
  fetchWithTimeout,
  OLLAMA_REQUEST_TIMEOUT_MS,
} from '../lib/ollama'
import { buildGenerationPrompt } from '../lib/prompting'

const EMPTY_HISTORY = Object.freeze({
  undoSnapshot: '',
  redoSnapshot: '',
  canUndoGeneration: false,
  canRedoGeneration: false,
  undoToggleState: 'undo',
})

export function usePromptGeneration({
  activeTabId,
  getActiveTab,
  getTabById,
  selectedModel,
  selectionRange,
  setTabContentById,
  updateTabById,
  promptFormRef,
}) {
  const [historyByTab, setHistoryByTab] = useState({})
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false)
  const [showStoppedToast, setShowStoppedToast] = useState(false)
  const streamTabIdRef = useRef('')
  const streamBaseRef = useRef('')
  const streamSelectionRef = useRef({ start: 0, end: 0 })
  const streamBufferRef = useRef('')
  const abortControllerRef = useRef(null)

  useEffect(
    () => () => {
      abortControllerRef.current?.abort()
    },
    [],
  )

  useEffect(() => {
    if (!showStoppedToast) return undefined
    const timeoutId = setTimeout(() => {
      setShowStoppedToast(false)
    }, 3000)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [showStoppedToast])

  const activeTab = useMemo(() => getActiveTab(), [getActiveTab])
  const historyForActiveTab = activeTabId ? historyByTab[activeTabId] ?? EMPTY_HISTORY : EMPTY_HISTORY
  const promptText = activeTab?.promptText ?? ''
  const promptError = activeTab?.promptError ?? ''

  const setPromptError = useCallback(
    (value, tabId = activeTabId) => {
      if (!tabId) return
      updateTabById(tabId, (tab) => ({ ...tab, promptError: value }))
    },
    [activeTabId, updateTabById],
  )

  const setPromptText = useCallback(
    (value, tabId = activeTabId) => {
      if (!tabId) return
      updateTabById(tabId, (tab) => ({ ...tab, promptText: value }))
    },
    [activeTabId, updateTabById],
  )

  const patchHistory = useCallback((tabId, patch) => {
    if (!tabId) return
    setHistoryByTab((previous) => {
      const current = previous[tabId] ?? EMPTY_HISTORY
      const next = typeof patch === 'function' ? patch(current) : { ...current, ...patch }
      return {
        ...previous,
        [tabId]: next,
      }
    })
  }, [])

  const resetGenerationState = useCallback(
    ({ clearPromptError = true, tabId = activeTabId } = {}) => {
      if (!tabId) return
      patchHistory(tabId, EMPTY_HISTORY)
      if (clearPromptError) {
        setPromptError('', tabId)
      }
    },
    [activeTabId, patchHistory, setPromptError],
  )

  const handleUndoGeneration = useCallback(() => {
    if (!activeTabId) return
    const tab = getTabById(activeTabId)
    if (!tab) return
    const tabHistory = historyByTab[activeTabId] ?? EMPTY_HISTORY
    if (!tabHistory.canUndoGeneration) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setTabContentById(activeTabId, tabHistory.undoSnapshot)
    patchHistory(activeTabId, {
      ...tabHistory,
      redoSnapshot: tab.content,
      canUndoGeneration: false,
      canRedoGeneration: true,
      undoToggleState: 'redo',
    })
    setPromptError('', activeTabId)
  }, [activeTabId, getTabById, historyByTab, patchHistory, setPromptError, setTabContentById])

  const handleRedoGeneration = useCallback(() => {
    if (!activeTabId) return
    const tabHistory = historyByTab[activeTabId] ?? EMPTY_HISTORY
    if (!tabHistory.canRedoGeneration) return

    setTabContentById(activeTabId, tabHistory.redoSnapshot)
    patchHistory(activeTabId, {
      ...tabHistory,
      canRedoGeneration: false,
      canUndoGeneration: true,
      undoToggleState: 'undo',
    })
  }, [activeTabId, historyByTab, patchHistory, setTabContentById])

  const handleUndoToggle = useCallback(() => {
    const tabHistory = historyForActiveTab
    if (tabHistory.undoToggleState === 'redo') {
      handleRedoGeneration()
      return
    }
    handleUndoGeneration()
  }, [handleRedoGeneration, handleUndoGeneration, historyForActiveTab])

  const abortGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const handlePromptSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      const tab = getActiveTab()
      if (!tab || !tab.promptText.trim()) return

      const submittingTabId = tab.id
      const tabContent = tab.content

      setIsLoadingPrompt(true)
      setPromptError('', submittingTabId)
      patchHistory(submittingTabId, {
        undoSnapshot: tabContent,
        redoSnapshot: '',
        canUndoGeneration: true,
        canRedoGeneration: false,
        undoToggleState: 'undo',
      })

      try {
        if (!selectedModel) {
          throw new Error('Please select a model to continue.')
        }

        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }

        abortControllerRef.current = new AbortController()
        streamTabIdRef.current = submittingTabId

        const hasRangeSelection = (selectionRange.start ?? 0) !== (selectionRange.end ?? 0)
        const selectedText = hasRangeSelection
          ? tabContent.slice(selectionRange.start ?? 0, selectionRange.end ?? 0)
          : ''

        streamBaseRef.current = tabContent
        streamSelectionRef.current = hasRangeSelection
          ? { start: selectionRange.start ?? 0, end: selectionRange.end ?? 0 }
          : { start: 0, end: tabContent.length }
        streamBufferRef.current = ''

        const refinedPrompt = buildGenerationPrompt({
          promptText: tab.promptText,
          documentText: tabContent,
          selectedText,
        })

        const response = await fetchWithTimeout(
          buildOllamaUrl('/api/generate'),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: abortControllerRef.current.signal,
            body: JSON.stringify({
              model: selectedModel,
              prompt: refinedPrompt,
              stream: true,
            }),
          },
          OLLAMA_REQUEST_TIMEOUT_MS,
        )

        if (!response.ok) {
          throw new Error('Ollama request failed. Is the server running?')
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('Streaming response not available.')
        }

        const decoder = new TextDecoder()
        let bufferedText = ''

        const applyStreamChunk = (chunk) => {
          if (!chunk) return
          const streamTabId = streamTabIdRef.current
          if (!streamTabId || !getTabById(streamTabId)) {
            abortControllerRef.current?.abort()
            return
          }

          streamBufferRef.current += chunk
          const cleanedStreamText = stripAssistantLeadIn(streamBufferRef.current)
          const base = streamBaseRef.current
          const { start, end } = streamSelectionRef.current
          const safeStart = Math.min(start, base.length)
          const safeEnd = Math.min(end, base.length)
          setTabContentById(streamTabId, `${base.slice(0, safeStart)}${cleanedStreamText}${base.slice(safeEnd)}`)
        }

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          bufferedText += decoder.decode(value, { stream: true })
          const lines = bufferedText.split('\n')
          bufferedText = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue
            try {
              const payload = JSON.parse(trimmed)
              if (payload?.response) {
                applyStreamChunk(payload.response)
              }
            } catch {
              // Ignore malformed lines
            }
          }
        }

        const finalLine = bufferedText.trim()
        if (finalLine) {
          try {
            const payload = JSON.parse(finalLine)
            if (payload?.response) {
              applyStreamChunk(payload.response)
            }
          } catch {
            // Ignore final parse errors
          }
        }
      } catch (error) {
        if (error?.name === 'AbortError') {
          setShowStoppedToast(false)
          requestAnimationFrame(() => setShowStoppedToast(true))
          return
        }
        setPromptError(error?.message ?? 'Unable to reach Ollama.', submittingTabId)
      } finally {
        setIsLoadingPrompt(false)
        abortControllerRef.current = null
        streamTabIdRef.current = ''
      }
    },
    [
      getActiveTab,
      getTabById,
      patchHistory,
      selectedModel,
      selectionRange.end,
      selectionRange.start,
      setPromptError,
      setTabContentById,
    ],
  )

  const handlePrimaryPromptAction = useCallback(() => {
    const tab = getActiveTab()
    if (!tab) return

    if (isLoadingPrompt) {
      abortGeneration()
      return
    }

    if (!tab.promptText.trim() || !selectedModel.trim()) return
    const form = promptFormRef.current
    if (!form) return

    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit()
      return
    }

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  }, [abortGeneration, getActiveTab, isLoadingPrompt, promptFormRef, selectedModel])

  const handlePromptKeyDown = useCallback(
    (event) => {
      if (event.key !== 'Enter') return
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault()
        handlePrimaryPromptAction()
        return
      }
      if (!isLoadingPrompt && promptText.trim() && selectedModel.trim()) return
      event.preventDefault()
    },
    [handlePrimaryPromptAction, isLoadingPrompt, promptText, selectedModel],
  )

  const handleClearPrompt = useCallback(() => {
    if (!activeTabId) return
    setPromptText('', activeTabId)
    setPromptError('', activeTabId)
  }, [activeTabId, setPromptError, setPromptText])

  return {
    abortGeneration,
    canRedoGeneration: historyForActiveTab.canRedoGeneration,
    canUndoGeneration: historyForActiveTab.canUndoGeneration,
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
    undoToggleState: historyForActiveTab.undoToggleState,
  }
}
