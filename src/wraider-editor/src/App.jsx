import { useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import './App.css'
import Editor from './components/Editor'

const DEFAULT_TEXT = `Welcome to Wraider.

Start writing here. Use Cmd+Shift+K to open AI commands.`

marked.setOptions({
  breaks: true,
  gfm: true,
})

function App() {
  const [theme, setTheme] = useState('light')
  const [content, setContent] = useState(DEFAULT_TEXT)
  const [isSaveOpen, setIsSaveOpen] = useState(false)
  const [fileName, setFileName] = useState('wraider-document.md')
  const [promptText, setPromptText] = useState('')
  const [promptResponse, setPromptResponse] = useState('')
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
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [modelError, setModelError] = useState('')
  const [selectionRange, setSelectionRange] = useState({ start: 0, end: 0 })
  const isDark = theme === 'dark'
  const showDragRegion =
    typeof navigator !== 'undefined' &&
    /Electron/.test(navigator.userAgent) &&
    /Mac/.test(navigator.platform)
  const fileInputRef = useRef(null)
  const streamBaseRef = useRef('')
  const streamSelectionRef = useRef({ start: 0, end: 0 })
  const streamBufferRef = useRef('')
  const abortControllerRef = useRef(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const renderedMarkdown = useMemo(() => marked.parse(content ?? ''), [content])

  useEffect(() => {
    let isMounted = true

    const loadModels = async () => {
      setIsLoadingModels(true)
      setModelError('')
      try {
        const response = await fetch('http://localhost:11434/api/tags')
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

        if (isMounted) {
          setModels(availableModels)
          setSelectedModel((current) => current || availableModels[0])
        }
      } catch (error) {
        if (isMounted) {
          setModels([])
          setSelectedModel('')
          setModelError(error?.message ?? 'Unable to load Ollama models.')
        }
      } finally {
        if (isMounted) {
          setIsLoadingModels(false)
        }
      }
    }

    loadModels()
    return () => {
      isMounted = false
    }
  }, [])

  const handleNew = () => {
    if (content.trim().length === 0 || window.confirm('Start a new document? Unsaved changes will be lost.')) {
      setContent('')
      setUndoSnapshot('')
      setRedoSnapshot('')
      setCanUndoGeneration(false)
      setCanRedoGeneration(false)
      setUndoToggleState('undo')
    }
  }

  const handleSaveClick = () => {
    setIsSaveOpen(true)
  }

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

  const handleLoadClick = () => {
    fileInputRef.current?.click()
  }

  const handleLoadFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
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
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleUndoGeneration = () => {
    if (!canUndoGeneration) return
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setRedoSnapshot(content)
    setContent(undoSnapshot)
    setPromptResponse('')
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

  const handlePromptOpen = (payload = {}) => {
    if (typeof payload?.selectionStart === 'number' && typeof payload?.selectionEnd === 'number') {
      setSelectionRange({ start: payload.selectionStart, end: payload.selectionEnd })
    }
  }

  const handleSelectionChange = (payload = {}) => {
    if (typeof payload?.selectionStart === 'number' && typeof payload?.selectionEnd === 'number') {
      setSelectionRange({ start: payload.selectionStart, end: payload.selectionEnd })
    }
  }

  const handlePromptSubmit = async (event) => {
    event.preventDefault()
    if (!promptText.trim()) return

    setIsLoadingPrompt(true)
    setPromptError('')
    setPromptResponse('')
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

      streamBaseRef.current = content
      streamSelectionRef.current = { start: selectionRange.start ?? 0, end: selectionRange.end ?? 0 }
      streamBufferRef.current = ''

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          model: selectedModel,
          prompt: `${promptText}\n\n---\n\n${content}`,
          stream: true,
        }),
      })

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
        const base = streamBaseRef.current
        const { start, end } = streamSelectionRef.current
        const safeStart = Math.min(start, base.length)
        const safeEnd = Math.min(end, base.length)
        setPromptResponse(streamBufferRef.current)
        setContent(`${base.slice(0, safeStart)}${streamBufferRef.current}${base.slice(safeEnd)}`)
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
          } catch (parseError) {
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
        } catch (parseError) {
          // Ignore final parse errors
        }
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        setPromptError('Generation stopped.')
        return
      }
      setPromptError(error?.message ?? 'Unable to reach Ollama.')
    } finally {
      setIsLoadingPrompt(false)
    }
  }

  return (
    <div className={`app${isDark ? ' app--dark' : ''}`}>
      {showDragRegion && <div className="app__drag-region" aria-hidden="true" />}
      <main className="app__main">
        <div className="editor-pane">
          {isPreviewOpen ? (
            <>
              <h2 className="preview-title">Markdown preview</h2>
              <section className={`preview preview--full${isDark ? ' preview--dark' : ''}`}>
                <div className="preview__content" dangerouslySetInnerHTML={{ __html: renderedMarkdown }} />
              </section>
            </>
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
            <form className="prompt-panel__form" onSubmit={handlePromptSubmit}>
              <div className="prompt-panel__row">
                <textarea
                  id="promptText"
                  className="prompt-panel__textarea"
                  value={promptText}
                  onChange={(event) => setPromptText(event.target.value)}
                  onFocus={() => setIsPromptFocused(true)}
                  onBlur={() => setIsPromptFocused(false)}
                  placeholder="Ask the AI to help with your writing..."
                  rows={4}
                />
                <div className="prompt-panel__actions">
                  <button
                    type="submit"
                    className="prompt-panel__button prompt-panel__button--primary"
                    disabled={isLoadingPrompt || isLoadingModels || !promptText.trim() || !selectedModel}
                  >
                    {isLoadingPrompt ? <span className="prompt-panel__spinner" aria-label="Generating" /> : 'Send'}
                  </button>
                  <button
                    type="button"
                    className="prompt-panel__button"
                    onClick={() => abortControllerRef.current?.abort()}
                    disabled={!isLoadingPrompt}
                  >
                    Stop
                  </button>
                  <button
                    type="button"
                    className="prompt-panel__button"
                    onClick={handleUndoToggle}
                    disabled={!canUndoGeneration && !canRedoGeneration}
                  >
                    {undoToggleState === 'redo' ? 'Redo' : 'Undo'}
                  </button>
                </div>
              </div>
              {modelError && <div className="prompt-panel__status prompt-panel__status--error">{modelError}</div>}
              {promptError && <div className="prompt-panel__status prompt-panel__status--error">{promptError}</div>}
            </form>
          </section>
        )}
      </main>
      <footer className="app__footer">
        <div className="app__footer-row">
          <div className="doc-actions">
            <button type="button" className="doc-actions__button" onClick={handleNew} aria-label="New document">
              <span className="material-symbols-rounded" aria-hidden="true">
                note_add
              </span>
            </button>
            <button type="button" className="doc-actions__button" onClick={handleSaveClick} aria-label="Save document">
              <span className="material-symbols-rounded" aria-hidden="true">
                save
              </span>
            </button>
            <button type="button" className="doc-actions__button" onClick={handleLoadClick} aria-label="Load document">
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
            >
              <span className="material-symbols-rounded" aria-hidden="true">
                preview
              </span>
            </button>
            <input
              ref={fileInputRef}
              className="doc-actions__file"
              type="file"
              accept={".md,text/markdown,text/plain"}
              onChange={handleLoadFile}
            />
          </div>
          <div className="footer-controls">
            <div className="footer-model">
              <select
                id="modelSelect"
                className="footer-model__select"
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
                disabled={isLoadingModels || models.length === 0}
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
          </div>
        </div>
      </footer>
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
              placeholder="wraider-document.md"
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
    </div>
  )
}

export default App
