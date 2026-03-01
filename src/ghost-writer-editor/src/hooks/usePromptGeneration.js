import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { extractInlinePromptTokens, hasInlinePromptTokens, stripAssistantLeadIn } from '../lib/contentTransforms'
import {
  buildOllamaUrl,
  fetchWithTimeout,
  getOllamaBaseUrl,
} from '../lib/ollama'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { ensureOllamaRunning, isDesktopRuntime, ollamaCancelStream } from '../lib/desktopRuntime'
import { buildGenerationPrompt, buildInlineGenerationPrompt } from '../lib/prompting'

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
  onStreamingRangeChange,
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
  const streamHighlightRangeRef = useRef({ start: 0, end: 0 })
  const abortControllerRef = useRef(null)
  const streamHighlightResetTimeoutRef = useRef(null)

  useEffect(
    () => () => {
      abortControllerRef.current?.abort()
      if (streamHighlightResetTimeoutRef.current) {
        clearTimeout(streamHighlightResetTimeoutRef.current)
        streamHighlightResetTimeoutRef.current = null
      }
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
  const hasInlinePrompts = useMemo(() => hasInlinePromptTokens(activeTab?.content ?? ''), [activeTab?.content])
  const hasPromptText = promptText.trim().length > 0
  const hasSelectedModel = selectedModel.trim().length > 0
  const canSubmitPrompt = hasSelectedModel && (hasPromptText || hasInlinePrompts)

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
    if (isDesktopRuntime()) {
      ollamaCancelStream()
    } else {
      abortControllerRef.current?.abort()
    }
  }, [])

  const streamPromptIntoRange = useCallback(
    async ({ tabId, baseContent, range, refinedPrompt }) => {
      streamTabIdRef.current = tabId
      streamBaseRef.current = baseContent
      streamSelectionRef.current = range
      streamBufferRef.current = ''
      streamHighlightRangeRef.current = { start: 0, end: 0 }

      const applyStreamChunk = (chunk) => {
        if (!chunk) return
        const streamTabId = streamTabIdRef.current
        if (!streamTabId || !getTabById(streamTabId)) return
        streamBufferRef.current += chunk
        const cleanedStreamText = stripAssistantLeadIn(streamBufferRef.current)
        const streamBase = streamBaseRef.current
        const { start, end } = streamSelectionRef.current
        const safeStart = Math.min(start, streamBase.length)
        const safeEnd = Math.min(end, streamBase.length)
        setTabContentById(streamTabId, `${streamBase.slice(0, safeStart)}${cleanedStreamText}${streamBase.slice(safeEnd)}`)
        const highlightEnd = safeStart + cleanedStreamText.length
        streamHighlightRangeRef.current = {
          start: safeStart,
          end: highlightEnd,
        }
        onStreamingRangeChange?.({
          tabId: streamTabId,
          start: safeStart,
          end: highlightEnd,
          isActive: cleanedStreamText.length > 0,
          isFading: false,
        })
      }

      if (isDesktopRuntime()) {
        const cancelledRef = { current: false }
        const unlistenChunk = await listen('ollama-stream-chunk', (e) => {
          applyStreamChunk(e.payload)
        })
        const unlistenDone = await listen('ollama-stream-done', () => {})
        const unlistenError = await listen('ollama-stream-error', (e) => {
          setPromptError(e.payload ?? 'Ollama error', tabId)
        })
        const unlistenCancelled = await listen('ollama-stream-cancelled', () => {
          cancelledRef.current = true
        })

        const unlistenAll = () => {
          unlistenChunk()
          unlistenDone()
          unlistenError()
          unlistenCancelled()
        }

        try {
          await invoke('ollama_generate_stream', {
            model: selectedModel,
            prompt: refinedPrompt,
          })
        } catch (err) {
          unlistenAll()
          throw err
        }
        unlistenAll()

        if (cancelledRef.current) {
          const abortErr = new Error('Generation stopped.')
          abortErr.name = 'AbortError'
          throw abortErr
        }

        const generatedText = stripAssistantLeadIn(streamBufferRef.current)
        const { start, end } = range
        const safeStart = Math.min(start, baseContent.length)
        const safeEnd = Math.min(end, baseContent.length)
        const nextContent = `${baseContent.slice(0, safeStart)}${generatedText}${baseContent.slice(safeEnd)}`
        setTabContentById(tabId, nextContent)
        return { generatedText, nextContent }
      }

      abortControllerRef.current = new AbortController()
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
            options: {
              num_predict: -1,
            },
          }),
        },
        0,
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

      const generatedText = stripAssistantLeadIn(streamBufferRef.current)
      const { start, end } = range
      const safeStart = Math.min(start, baseContent.length)
      const safeEnd = Math.min(end, baseContent.length)
      const nextContent = `${baseContent.slice(0, safeStart)}${generatedText}${baseContent.slice(safeEnd)}`
      setTabContentById(tabId, nextContent)
      return { generatedText, nextContent }
    },
    [getTabById, onStreamingRangeChange, selectedModel, setPromptError, setTabContentById],
  )

  const handlePromptSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      const tab = getActiveTab()
      if (!tab) return

      const tabInlinePrompts = extractInlinePromptTokens(tab.content)
      const hasTabInlinePrompts = tabInlinePrompts.length > 0
      const hasTabPromptText = tab.promptText.trim().length > 0
      if (!hasTabPromptText && !hasTabInlinePrompts) return

      const submittingTabId = tab.id
      const tabContent = tab.content

      if (streamHighlightResetTimeoutRef.current) {
        clearTimeout(streamHighlightResetTimeoutRef.current)
        streamHighlightResetTimeoutRef.current = null
      }

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

        if (isDesktopRuntime()) {
          const ensure = await ensureOllamaRunning()
          if (!ensure.ok) {
            setPromptError(ensure.error ?? 'Ollama could not be started.', submittingTabId)
            return
          }
        }

        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }

        if (hasTabInlinePrompts) {
          let currentContent = tabContent
          let offsetDelta = 0

          for (const inlinePrompt of tabInlinePrompts) {
            const start = inlinePrompt.start + offsetDelta
            const end = inlinePrompt.end + offsetDelta
            const refinedPrompt = buildInlineGenerationPrompt({
              globalPromptText: tab.promptText,
              inlinePromptText: inlinePrompt.innerText,
              documentText: currentContent,
            })

            const result = await streamPromptIntoRange({
              tabId: submittingTabId,
              baseContent: currentContent,
              range: { start, end },
              refinedPrompt,
            })

            offsetDelta += result.generatedText.length - (end - start)
            currentContent = result.nextContent
          }
        } else {
          const hasRangeSelection = (selectionRange.start ?? 0) !== (selectionRange.end ?? 0)
          const selectedText = hasRangeSelection
            ? tabContent.slice(selectionRange.start ?? 0, selectionRange.end ?? 0)
            : ''
          const cursorPosition = Math.max(0, Math.min(selectionRange.start ?? 0, tabContent.length))
          const range = hasRangeSelection
            ? { start: selectionRange.start ?? 0, end: selectionRange.end ?? 0 }
            : { start: cursorPosition, end: cursorPosition }
          const refinedPrompt = buildGenerationPrompt({
            promptText: tab.promptText,
            documentText: tabContent,
            selectedText,
          })

          await streamPromptIntoRange({
            tabId: submittingTabId,
            baseContent: tabContent,
            range,
            refinedPrompt,
          })
        }
      } catch (error) {
        if (error?.name === 'AbortError') {
          setShowStoppedToast(false)
          requestAnimationFrame(() => setShowStoppedToast(true))
          return
        }
        const rawMessage = error?.message ?? ''
        const friendlyMessage =
          rawMessage === 'Failed to fetch'
            ? `Cannot reach Ollama. Is it running? (Check ${getOllamaBaseUrl()})`
            : rawMessage || 'Unable to reach Ollama.'
        setPromptError(friendlyMessage, submittingTabId)
      } finally {
        setIsLoadingPrompt(false)
        abortControllerRef.current = null
        streamTabIdRef.current = ''
        const finalHighlightStart = streamHighlightRangeRef.current.start ?? 0
        const finalHighlightEnd = streamHighlightRangeRef.current.end ?? 0

        if (finalHighlightEnd > finalHighlightStart) {
          onStreamingRangeChange?.({
            tabId: submittingTabId,
            start: finalHighlightStart,
            end: finalHighlightEnd,
            isActive: false,
            isFading: true,
          })
        }

        streamHighlightResetTimeoutRef.current = setTimeout(() => {
          onStreamingRangeChange?.({
            tabId: submittingTabId,
            start: 0,
            end: 0,
            isActive: false,
            isFading: false,
          })
          streamHighlightResetTimeoutRef.current = null
        }, 1000)
      }
    },
    [
      getActiveTab,
      onStreamingRangeChange,
      patchHistory,
      selectedModel,
      selectionRange.end,
      selectionRange.start,
      setPromptError,
      streamPromptIntoRange,
    ],
  )

  const handlePrimaryPromptAction = useCallback(() => {
    const tab = getActiveTab()
    if (!tab) return

    if (isLoadingPrompt) {
      abortGeneration()
      return
    }

    if (!canSubmitPrompt) return
    const form = promptFormRef.current
    if (!form) return

    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit()
      return
    }

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  }, [abortGeneration, canSubmitPrompt, getActiveTab, isLoadingPrompt, promptFormRef])

  const handlePromptKeyDown = useCallback(
    (event) => {
      if (event.key !== 'Enter') return
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault()
        handlePrimaryPromptAction()
        return
      }
      if (!isLoadingPrompt && canSubmitPrompt) return
      event.preventDefault()
    },
    [canSubmitPrompt, handlePrimaryPromptAction, isLoadingPrompt],
  )

  const handleClearPrompt = useCallback(() => {
    if (!activeTabId) return
    setPromptText('', activeTabId)
    setPromptError('', activeTabId)
  }, [activeTabId, setPromptError, setPromptText])

  return {
    abortGeneration,
    canRedoGeneration: historyForActiveTab.canRedoGeneration,
    canSubmitPrompt,
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
