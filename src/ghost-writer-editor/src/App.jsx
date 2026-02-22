import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import Editor from './components/Editor'
import {
  collectCheckboxLineIndexes,
  normalizeCustomCheckboxLines,
  stripAssistantLeadIn,
  toggleCheckboxOnLine,
} from './lib/contentTransforms'
import { isMacDesktopRuntime, markRendererInteractive } from './lib/desktopRuntime'
import { renderMarkdownToSafeHtml } from './lib/markdown'
import {
  buildOllamaUrl,
  fetchWithTimeout,
  getOllamaBaseUrl,
  getOllamaBaseUrls,
  OLLAMA_REQUEST_TIMEOUT_MS,
  setActiveOllamaBaseUrl,
} from './lib/ollama'
import { buildGenerationPrompt } from './lib/prompting'

const DEFAULT_TEXT = ''
const DEFAULT_FILE_NAME = 'ghost-writer-document.md'
const MAX_LOAD_FILE_SIZE_BYTES = 2 * 1024 * 1024
const MODEL_LOAD_IDLE_DELAY_MS = 350

function App() {
  const [theme, setTheme] = useState('dark')
  const [content, setContent] = useState(DEFAULT_TEXT)
  const [isFooterCollapsed, setIsFooterCollapsed] = useState(true)
  const [isSaveOpen, setIsSaveOpen] = useState(false)
  const [isNewConfirmOpen, setIsNewConfirmOpen] = useState(false)
  const [fileName, setFileName] = useState(DEFAULT_FILE_NAME)
  const [promptText, setPromptText] = useState('')
  const [promptError, setPromptError] = useState('')
  const [undoSnapshot, setUndoSnapshot] = useState('')
  const [redoSnapshot, setRedoSnapshot] = useState('')
  const [canUndoGeneration, setCanUndoGeneration] = useState(false)
  const [canRedoGeneration, setCanRedoGeneration] = useState(false)
  const [undoToggleState, setUndoToggleState] = useState('undo')
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState('')
  const [isPromptFocused, setIsPromptFocused] = useState(false)
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false)
  const [showStoppedToast, setShowStoppedToast] = useState(false)
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [modelError, setModelError] = useState('')
  const [selectionRange, setSelectionRange] = useState({ start: 0, end: 0 })
  const isDark = theme === 'dark'
  const showDragRegion = isMacDesktopRuntime()
  const fileInputRef = useRef(null)
  const promptFormRef = useRef(null)
  const saveActionRef = useRef(() => {})
  const openActionRef = useRef(() => {})
  const newActionRef = useRef(() => {})
  const streamBaseRef = useRef('')
  const streamSelectionRef = useRef({ start: 0, end: 0 })
  const streamBufferRef = useRef('')
  const modelLoadInFlightRef = useRef(false)
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const appRef = useRef(null)
  const footerRef = useRef(null)
  const previewContentRef = useRef(null)
  const checkboxLineIndexes = useMemo(
    () => (isPreviewOpen ? collectCheckboxLineIndexes(content) : []),
    [content, isPreviewOpen],
  )
  const normalizedPreviewMarkdown = useMemo(
    () => (isPreviewOpen ? normalizeCustomCheckboxLines(content) : ''),
    [content, isPreviewOpen],
  )
  const renderedMarkdown = useMemo(
    () => (isPreviewOpen ? renderMarkdownToSafeHtml(normalizedPreviewMarkdown) : ''),
    [isPreviewOpen, normalizedPreviewMarkdown],
  )

  useEffect(() => {
    if (!appRef.current || !footerRef.current) return undefined

    const appElement = appRef.current
    const footerElement = footerRef.current

    const syncFooterHeight = () => {
      appElement.style.setProperty('--app-footer-height', `${footerElement.offsetHeight}px`)
    }

    syncFooterHeight()

    const canObserveResize = typeof ResizeObserver !== 'undefined'
    const resizeObserver = canObserveResize ? new ResizeObserver(syncFooterHeight) : null
    resizeObserver?.observe(footerElement)
    window.addEventListener('resize', syncFooterHeight)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', syncFooterHeight)
    }
  }, [])

  useEffect(
    () => () => {
      isMountedRef.current = false
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

  const loadModels = useCallback(async () => {
    if (modelLoadInFlightRef.current || models.length > 0) return

    modelLoadInFlightRef.current = true
    setIsLoadingModels(true)
    setModelError('')
    try {
      const baseUrls = getOllamaBaseUrls()
      let lastError = null

      for (const baseUrl of baseUrls) {
        try {
          const response = await fetchWithTimeout(buildOllamaUrl('/api/tags', baseUrl))
          if (!response.ok) {
            throw new Error('Unable to load Ollama models.')
          }
          const data = await response.json()
          const availableModels = Array.isArray(data?.models)
            ? data.models.map((model) => model?.name).filter(Boolean)
            : []

          if (!availableModels.length) {
            throw new Error('No Ollama models found.')
          }

          setActiveOllamaBaseUrl(baseUrl)
          if (isMountedRef.current) {
            setModels(availableModels)
            setSelectedModel((current) => current || availableModels[0])
          }
          return
        } catch (error) {
          lastError = error
        }
      }

      throw lastError ?? new Error('Unable to load Ollama models.')
    } catch (error) {
      const isAbortError = error?.name === 'AbortError'
      const isNetworkError = error instanceof TypeError
      const connectionMessage = `Unable to connect to Ollama at ${getOllamaBaseUrl()}. Start Ollama and try again.`
      if (isMountedRef.current) {
        setModels([])
        setSelectedModel('')
        setModelError(
          isAbortError
            ? 'Timed out loading Ollama models.'
            : isNetworkError
              ? connectionMessage
              : error?.message ?? 'Unable to load Ollama models.',
        )
      }
    } finally {
      modelLoadInFlightRef.current = false
      if (isMountedRef.current) {
        setIsLoadingModels(false)
      }
    }
  }, [models.length])

  useEffect(() => {
    const runWhenIdle = () => {
      void loadModels()
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(runWhenIdle, { timeout: 1000 })
      return () => window.cancelIdleCallback(idleId)
    }

    const timeoutId = setTimeout(runWhenIdle, MODEL_LOAD_IDLE_DELAY_MS)
    return () => clearTimeout(timeoutId)
  }, [loadModels])

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      markRendererInteractive({ source: 'app-mounted' })
    })
    return () => cancelAnimationFrame(frameId)
  }, [])

  const resetDocument = useCallback(() => {
    setContent('')
    setUndoSnapshot('')
    setRedoSnapshot('')
    setCanUndoGeneration(false)
    setCanRedoGeneration(false)
    setUndoToggleState('undo')
    setPromptError('')
  }, [])

  const handleNew = useCallback(() => {
    if (content.trim().length === 0) {
      resetDocument()
      return
    }

    setIsNewConfirmOpen(true)
  }, [content, resetDocument])

  const handleConfirmNew = useCallback(() => {
    resetDocument()
    setIsNewConfirmOpen(false)
  }, [resetDocument])

  const handleSaveClick = useCallback(() => {
    setIsSaveOpen(true)
  }, [])

  const handleSaveConfirm = () => {
    if (!fileName.trim()) return
    const safeName = fileName.toLowerCase().endsWith('.md') ? fileName : `${fileName}.md`
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = safeName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setIsSaveOpen(false)
  }

  const handleLoadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  useEffect(() => {
    saveActionRef.current = handleSaveClick
    openActionRef.current = handleLoadClick
    newActionRef.current = handleNew
  }, [handleLoadClick, handleNew, handleSaveClick])

  const handleLoadFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > MAX_LOAD_FILE_SIZE_BYTES) {
      setPromptError('Selected file is too large. Please use a file smaller than 2 MB.')
      event.target.value = ''
      return
    }

    setPromptError('')
    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      setContent(loadEvent.target?.result?.toString() ?? '')
      setUndoSnapshot('')
      setRedoSnapshot('')
      setCanUndoGeneration(false)
      setCanRedoGeneration(false)
      setUndoToggleState('undo')
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const handleCopyClick = async () => {
    const rawSelection = document.getSelection()?.toString() ?? ''
    const hasRangeSelection = selectionRange.start !== selectionRange.end
    const editorSelection = hasRangeSelection
      ? content.slice(selectionRange.start, selectionRange.end)
      : ''
    const textToCopy = rawSelection || editorSelection || content

    try {
      await navigator.clipboard.writeText(textToCopy)
      setPromptError('')
    } catch (error) {
      setPromptError(error?.message ?? 'Unable to copy text to the clipboard.')
    }
  }

  const handleUndoGeneration = () => {
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
  }

  const handleRedoGeneration = () => {
    if (!canRedoGeneration) return
    setContent(redoSnapshot)
    setCanRedoGeneration(false)
    setCanUndoGeneration(true)
    setUndoToggleState('undo')
  }

  const handleUndoToggle = () => {
    if (undoToggleState === 'redo') {
      handleRedoGeneration()
      return
    }
    handleUndoGeneration()
  }

  const handlePromptOpen = useCallback((payload = {}) => {
    if (typeof payload?.selectionStart === 'number' && typeof payload?.selectionEnd === 'number') {
      setSelectionRange({ start: payload.selectionStart, end: payload.selectionEnd })
    }
  }, [])

  const handleClearPrompt = () => {
    setPromptText('')
    setPromptError('')
  }

  const handleSelectionChange = useCallback((payload = {}) => {
    if (typeof payload?.selectionStart === 'number' && typeof payload?.selectionEnd === 'number') {
      setSelectionRange({ start: payload.selectionStart, end: payload.selectionEnd })
    }
  }, [])

  const handlePreviewCheckboxToggle = useCallback(
    (event) => {
      const checkbox = event.target
      if (!(checkbox instanceof HTMLInputElement) || checkbox.type !== 'checkbox') return
      const sourceLine = Number(checkbox.dataset.sourceLine)
      if (!Number.isInteger(sourceLine)) return

      setContent((currentContent) => toggleCheckboxOnLine(currentContent, sourceLine, checkbox.checked))
    },
    [setContent],
  )

  const handlePromptSubmit = async (event) => {
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
  }

  const handlePromptKeyDown = (event) => {
    if (event.key !== 'Enter') return
    if (!isLoadingPrompt && !isLoadingModels && promptText.trim() && selectedModel) return
    event.preventDefault()
  }

  const handlePrimaryPromptAction = () => {
    if (isLoadingPrompt) {
      abortControllerRef.current?.abort()
      return
    }

    if (isLoadingModels || !promptText.trim() || !selectedModel) return
    promptFormRef.current?.requestSubmit()
  }

  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      const key = event.key.toLowerCase()

      if (event.ctrlKey && event.shiftKey && key === 's') {
        event.preventDefault()
        saveActionRef.current?.()
        return
      }

      if (event.ctrlKey && event.shiftKey && key === 'o') {
        event.preventDefault()
        openActionRef.current?.()
        return
      }

      if (event.ctrlKey && event.shiftKey && key === 'n') {
        event.preventDefault()
        newActionRef.current?.()
        return
      }

      if (!event.ctrlKey || !event.shiftKey) return
      if (key !== 'm') return

      event.preventDefault()
      setIsPreviewOpen((previous) => !previous)
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [])

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

  return (
    <div ref={appRef} className={`app${isDark ? ' app--dark' : ''}`}>
      {showDragRegion && <div className="app__drag-region" aria-hidden="true" />}
      <main className="app__main">
        <div className={`editor-pane${isPreviewOpen ? ' editor-pane--preview' : ''}`}>
          {isPreviewOpen ? (
            <section className={`preview preview--full${isDark ? ' preview--dark' : ''}`}>
              <div
                ref={previewContentRef}
                className="preview__content"
                onClick={handlePreviewCheckboxToggle}
                dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
              />
            </section>
          ) : (
            <Editor
              value={content}
              onChange={setContent}
              onPromptOpen={handlePromptOpen}
              onSelectionChange={handleSelectionChange}
              selectionRange={selectionRange}
              showSelectionOverlay={isPromptFocused}
            />
          )}
        </div>
        {!isPreviewOpen && (
          <section className={`prompt-panel${isDark ? ' prompt-panel--dark' : ''}`}>
            <form ref={promptFormRef} className="prompt-panel__form" onSubmit={handlePromptSubmit}>
              <div className="prompt-panel__row">
                <input
                  id="promptText"
                  className="prompt-panel__input"
                  type="text"
                  aria-label="Prompt input"
                  value={promptText}
                  onChange={(event) => setPromptText(event.target.value)}
                  onKeyDown={handlePromptKeyDown}
                  onFocus={() => setIsPromptFocused(true)}
                  onBlur={() => setIsPromptFocused(false)}
                  placeholder=""
                />
                <div className="prompt-panel__actions">
                  {showStoppedToast && (
                    <div className="prompt-panel__stopped-toast" aria-live="polite">
                      Stopped
                    </div>
                  )}
                  <button
                    type="button"
                    className={`prompt-panel__button prompt-panel__button--primary${
                      isLoadingPrompt ? ' prompt-panel__button--busy' : ''
                    }`}
                    disabled={!isLoadingPrompt && (isLoadingModels || !promptText.trim() || !selectedModel)}
                    aria-label={isLoadingPrompt ? 'Stop generation' : 'Send prompt'}
                    title={isLoadingPrompt ? 'Stop' : 'Send'}
                    onClick={handlePrimaryPromptAction}
                  >
                    {isLoadingPrompt ? (
                      <span className="prompt-panel__button-content" aria-label="Generating">
                        <span className="prompt-panel__spinner" />
                        <span className="material-symbols-rounded" aria-hidden="true">
                          stop
                        </span>
                      </span>
                    ) : (
                      <span className="material-symbols-rounded" aria-hidden="true">
                        send
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    className="prompt-panel__button"
                    onClick={handleUndoToggle}
                    disabled={!canUndoGeneration && !canRedoGeneration}
                    aria-label={undoToggleState === 'redo' ? 'Redo generation' : 'Undo generation'}
                    title={undoToggleState === 'redo' ? 'Redo' : 'Undo'}
                  >
                    <span className="material-symbols-rounded" aria-hidden="true">
                      {undoToggleState === 'redo' ? 'redo' : 'undo'}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="prompt-panel__button"
                    onClick={handleClearPrompt}
                    aria-label="Clear prompt"
                    title="Clear"
                  >
                    <span className="material-symbols-rounded" aria-hidden="true">
                      clear_all
                    </span>
                  </button>
                </div>
              </div>
              {modelError && <div className="prompt-panel__status prompt-panel__status--error">{modelError}</div>}
              {promptError && (
                <div
                  className={`prompt-panel__status ${
                    promptError === 'Generation stopped.' ? 'prompt-panel__status--stopped' : 'prompt-panel__status--error'
                  }`}
                >
                  {promptError}
                </div>
              )}
            </form>
          </section>
        )}
      </main>
      <footer
        ref={footerRef}
        className={`app__footer${isFooterCollapsed ? ' app__footer--collapsed' : ''}`}
        onClick={isFooterCollapsed ? () => setIsFooterCollapsed(false) : undefined}
        onKeyDown={
          isFooterCollapsed
            ? (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                setIsFooterCollapsed(false)
              }
            : undefined
        }
        role={isFooterCollapsed ? 'button' : undefined}
        tabIndex={isFooterCollapsed ? 0 : undefined}
        aria-label={isFooterCollapsed ? 'Expand footer controls' : undefined}
      >
        <div className="app__footer-row">
          {!isFooterCollapsed && (
            <div className="doc-actions">
              <button
                type="button"
                className="doc-actions__button"
                onClick={handleNew}
                aria-label="New document"
                title="New (Ctrl+Shift+N)"
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  note_add
                </span>
              </button>
              <button
                type="button"
                className="doc-actions__button"
                onClick={handleSaveClick}
                aria-label="Save document"
                title="Save (Ctrl+Shift+S)"
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  save
                </span>
              </button>
              <button
                type="button"
                className="doc-actions__button"
                onClick={handleLoadClick}
                aria-label="Load document"
                title="Open (Ctrl+Shift+O)"
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  upload_file
                </span>
              </button>
              <button
                type="button"
                className="doc-actions__button"
                onClick={handleCopyClick}
                aria-label="Copy to clipboard"
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  content_copy
                </span>
              </button>
              <button
                type="button"
                className={`doc-actions__button${isPreviewOpen ? ' doc-actions__button--active' : ''}`}
                onClick={() => setIsPreviewOpen((previous) => !previous)}
                aria-label="Toggle markdown preview"
                aria-pressed={isPreviewOpen}
                title="Preview (Ctrl+Shift+M)"
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  preview
                </span>
              </button>
            </div>
          )}
          {!isFooterCollapsed && (
            <div className="footer-controls">
              <div className="footer-model">
                <select
                  id="modelSelect"
                  className="footer-model__select"
                  aria-label="Ollama model"
                  value={selectedModel}
                  onChange={(event) => setSelectedModel(event.target.value)}
                  onFocus={() => {
                    if (!models.length) {
                      void loadModels()
                    }
                  }}
                  disabled={isLoadingModels}
                >
                  {models.length === 0 ? (
                    <option value="">No models available</option>
                  ) : (
                    models.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                  ))
                )}
              </select>
              </div>
              <button
                type="button"
                className="theme-toggle"
                aria-pressed={isDark}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  {isDark ? 'light_mode' : 'dark_mode'}
                </span>
              </button>
              <span className="footer-controls__divider" aria-hidden="true">
                |
              </span>
              <button
                type="button"
                className="footer-collapse"
                aria-expanded={!isFooterCollapsed}
                aria-label="Collapse footer"
                onClick={() => setIsFooterCollapsed(true)}
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  keyboard_arrow_down
                </span>
              </button>
            </div>
          )}
        </div>
      </footer>
      <input
        ref={fileInputRef}
        className="doc-actions__file"
        type="file"
        accept={".md,text/markdown,text/plain"}
        onChange={handleLoadFile}
      />
      {isSaveOpen && (
        <div className="modal-overlay" onClick={() => setIsSaveOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2 className="modal__title">Save markdown file</h2>
            <p className="modal__description">Choose a file name for your document.</p>
            <label className="modal__label" htmlFor="fileName">
              File name
            </label>
            <input
              id="fileName"
              className="modal__input"
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              placeholder="ghost-writer-document.md"
            />
            <div className="modal__actions">
              <button type="button" className="modal__button" onClick={() => setIsSaveOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="modal__button modal__button--primary"
                onClick={handleSaveConfirm}
                disabled={!fileName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {isNewConfirmOpen && (
        <div className="modal-overlay" onClick={() => setIsNewConfirmOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2 className="modal__title">Start a new document?</h2>
            <p className="modal__description">Unsaved changes will be lost.</p>
            <div className="modal__actions">
              <button type="button" className="modal__button" onClick={() => setIsNewConfirmOpen(false)}>
                Cancel
              </button>
              <button type="button" className="modal__button modal__button--primary" onClick={handleConfirmNew}>
                New
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
