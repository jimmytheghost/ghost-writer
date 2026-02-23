import { useCallback, useEffect, useRef, useState } from 'react'
import { stripAssistantLeadIn } from '../lib/contentTransforms'
import {
  buildOllamaUrl,
  fetchWithTimeout,
  OLLAMA_REQUEST_TIMEOUT_MS,
} from '../lib/ollama'
import { buildGenerationPrompt } from '../lib/prompting'

export function usePromptGeneration({
  content,
  selectedModel,
  selectionRange,
  setContent,
  promptFormRef,
}) {
  const [promptText, setPromptText] = useState('')
  const [promptError, setPromptError] = useState('')
  const [undoSnapshot, setUndoSnapshot] = useState('')
  const [redoSnapshot, setRedoSnapshot] = useState('')
  const [canUndoGeneration, setCanUndoGeneration] = useState(false)
  const [canRedoGeneration, setCanRedoGeneration] = useState(false)
  const [undoToggleState, setUndoToggleState] = useState('undo')
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false)
  const [showStoppedToast, setShowStoppedToast] = useState(false)
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

  const resetGenerationState = useCallback(
    ({ clearPromptError = true } = {}) => {
      setUndoSnapshot('')
      setRedoSnapshot('')
      setCanUndoGeneration(false)
      setCanRedoGeneration(false)
      setUndoToggleState('undo')
      if (clearPromptError) {
        setPromptError('')
      }
    },
    [],
  )

  const handleUndoGeneration = useCallback(() => {
    if (!canUndoGeneration) return
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setRedoSnapshot(content)
    setContent(undoSnapshot)
    setPromptError('')
    setCanUndoGeneration(false)
    setCanRedoGeneration(true)
    setUndoToggleState('redo')
  }, [canUndoGeneration, content, setContent, undoSnapshot])

  const handleRedoGeneration = useCallback(() => {
    if (!canRedoGeneration) return
    setContent(redoSnapshot)
    setCanRedoGeneration(false)
    setCanUndoGeneration(true)
    setUndoToggleState('undo')
  }, [canRedoGeneration, redoSnapshot, setContent])

  const handleUndoToggle = useCallback(() => {
    if (undoToggleState === 'redo') {
      handleRedoGeneration()
      return
    }
    handleUndoGeneration()
  }, [handleRedoGeneration, handleUndoGeneration, undoToggleState])

  const handlePromptSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      if (!promptText.trim()) return

      setIsLoadingPrompt(true)
      setPromptError('')
      setUndoSnapshot(content)
      setCanUndoGeneration(true)
      setRedoSnapshot('')
      setCanRedoGeneration(false)
      setUndoToggleState('undo')

      try {
        if (!selectedModel) {
          throw new Error('Please select a model to continue.')
        }

        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }

        abortControllerRef.current = new AbortController()

        const hasRangeSelection = (selectionRange.start ?? 0) !== (selectionRange.end ?? 0)
        const selectedText = hasRangeSelection
          ? content.slice(selectionRange.start ?? 0, selectionRange.end ?? 0)
          : ''

        streamBaseRef.current = content
        streamSelectionRef.current = hasRangeSelection
          ? { start: selectionRange.start ?? 0, end: selectionRange.end ?? 0 }
          : { start: 0, end: content.length }
        streamBufferRef.current = ''

        const refinedPrompt = buildGenerationPrompt({
          promptText,
          documentText: content,
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
          streamBufferRef.current += chunk
          const cleanedStreamText = stripAssistantLeadIn(streamBufferRef.current)
          const base = streamBaseRef.current
          const { start, end } = streamSelectionRef.current
          const safeStart = Math.min(start, base.length)
          const safeEnd = Math.min(end, base.length)
          setContent(`${base.slice(0, safeStart)}${cleanedStreamText}${base.slice(safeEnd)}`)
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
        setPromptError(error?.message ?? 'Unable to reach Ollama.')
      } finally {
        setIsLoadingPrompt(false)
        abortControllerRef.current = null
      }
    },
    [content, promptText, selectedModel, selectionRange.end, selectionRange.start, setContent],
  )

  const handlePrimaryPromptAction = useCallback(() => {
    if (isLoadingPrompt) {
      abortControllerRef.current?.abort()
      return
    }

    if (!promptText.trim() || !selectedModel.trim()) return
    const form = promptFormRef.current
    if (!form) return

    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit()
      return
    }

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  }, [isLoadingPrompt, promptFormRef, promptText, selectedModel])

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
    setPromptText('')
    setPromptError('')
  }, [])

  return {
    canRedoGeneration,
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
  }
}
