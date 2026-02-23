import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import bundledModelSnapshot from './generated/ollama-models.json'
import Editor from './components/Editor'
import { useDesktopAppMetadata } from './hooks/useDesktopAppMetadata'
import { useFooterHeightSync } from './hooks/useFooterHeightSync'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { useModelLoader } from './hooks/useModelLoader'
import { usePromptGeneration } from './hooks/usePromptGeneration'
import { useTauriMenuEvents } from './hooks/useTauriMenuEvents'
import {
  collectCheckboxLineIndexes,
  normalizeCustomCheckboxLines,
  toggleCheckboxOnLine,
} from './lib/contentTransforms'
import {
  isMacDesktopRuntime,
  markRendererInteractive,
  setAlwaysOnTop,
} from './lib/desktopRuntime'
import { renderMarkdownToSafeHtml } from './lib/markdown'

const DEFAULT_TEXT = ''
const DEFAULT_FILE_NAME = 'ghost-writer-document.md'
const MAX_LOAD_FILE_SIZE_BYTES = 2 * 1024 * 1024
const ALWAYS_ON_TOP_STORAGE_KEY = 'ghost-writer-always-on-top'
const BUNDLED_MODELS = Array.isArray(bundledModelSnapshot?.models)
  ? bundledModelSnapshot.models.filter(Boolean)
  : []

function readInitialAlwaysOnTop() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(ALWAYS_ON_TOP_STORAGE_KEY) === 'true'
}

function App() {
  const [theme, setTheme] = useState('dark')
  const [content, setContent] = useState(DEFAULT_TEXT)
  const [isFooterCollapsed, setIsFooterCollapsed] = useState(true)
  const [isSaveOpen, setIsSaveOpen] = useState(false)
  const [isNewConfirmOpen, setIsNewConfirmOpen] = useState(false)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [fileName, setFileName] = useState(DEFAULT_FILE_NAME)
  const [appName, setAppName] = useState('Ghost Writer')
  const [appVersion, setAppVersion] = useState('0.1.0')
  const [isPromptFocused, setIsPromptFocused] = useState(false)
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(() => readInitialAlwaysOnTop())
  const [selectionRange, setSelectionRange] = useState({ start: 0, end: 0 })
  const isDark = theme === 'dark'
  const showDragRegion = isMacDesktopRuntime()
  const modKeyLabel = showDragRegion ? 'Cmd' : 'Ctrl'
  const fileInputRef = useRef(null)
  const promptFormRef = useRef(null)
  const saveActionRef = useRef(() => {})
  const openActionRef = useRef(() => {})
  const newActionRef = useRef(() => {})
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const appRef = useRef(null)
  const footerRef = useRef(null)
  const previewContentRef = useRef(null)
  const { models, selectedModel, setSelectedModel, isLoadingModels, modelLoadStatus, loadModels } =
    useModelLoader({ bundledModels: BUNDLED_MODELS })
  const {
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
  } = usePromptGeneration({
    content,
    selectedModel,
    selectionRange,
    setContent,
    promptFormRef,
  })
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

  useFooterHeightSync(appRef, footerRef)

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      markRendererInteractive({ source: 'app-mounted' })
    })
    return () => cancelAnimationFrame(frameId)
  }, [])

  useDesktopAppMetadata({ setAppName, setAppVersion })

  useEffect(() => {
    void setAlwaysOnTop(isAlwaysOnTop)
  }, [isAlwaysOnTop])

  const resetDocument = useCallback(() => {
    setContent('')
    resetGenerationState()
  }, [resetGenerationState])

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
      resetGenerationState()
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

  const handlePromptOpen = useCallback((payload = {}) => {
    if (typeof payload?.selectionStart === 'number' && typeof payload?.selectionEnd === 'number') {
      setSelectionRange({ start: payload.selectionStart, end: payload.selectionEnd })
    }
  }, [])

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

  const handleAlwaysOnTopToggle = useCallback(() => {
    setIsAlwaysOnTop((previous) => {
      const nextValue = !previous
      window.localStorage.setItem(ALWAYS_ON_TOP_STORAGE_KEY, String(nextValue))
      return nextValue
    })
  }, [])

  const handleShowPreview = useCallback(() => {
    setIsPreviewOpen(true)
  }, [])

  const handleShowMarkdown = useCallback(() => {
    setIsPreviewOpen(false)
  }, [])

  const handleTogglePreview = useCallback(() => {
    setIsPreviewOpen((previous) => !previous)
  }, [])

  useGlobalShortcuts({
    saveActionRef,
    openActionRef,
    newActionRef,
    onToggleAlwaysOnTop: handleAlwaysOnTopToggle,
    onTogglePreview: handleTogglePreview,
  })

  useTauriMenuEvents({
    onNew: handleNew,
    onOpen: handleLoadClick,
    onSave: handleSaveClick,
    onShowPreview: handleShowPreview,
    onShowMarkdown: handleShowMarkdown,
    onToggleAlwaysOnTop: handleAlwaysOnTopToggle,
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
                    disabled={!isLoadingPrompt && (!promptText.trim() || !selectedModel.trim())}
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
                title={`New (${modKeyLabel}+N)`}
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
                title={`Save (${modKeyLabel}+S)`}
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
                title={`Open (${modKeyLabel}+O)`}
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
                onClick={handleTogglePreview}
                aria-label="Toggle markdown preview"
                aria-pressed={isPreviewOpen}
                title={`Preview (${modKeyLabel}+M)`}
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
                  title={selectedModel || 'No models available'}
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
                {models.length === 0 && (
                  <div className="footer-model__status">{modelLoadStatus}</div>
                )}
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
              <button
                type="button"
                className={`footer-pin${isAlwaysOnTop ? ' doc-actions__button--active' : ''}`}
                aria-pressed={isAlwaysOnTop}
                aria-label="Toggle always on top"
                title={`Always on top (${modKeyLabel}+T)`}
                onClick={handleAlwaysOnTopToggle}
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  push_pin
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
      {isAboutOpen && (
        <div className="modal-overlay" onClick={() => setIsAboutOpen(false)}>
          <div className="modal about-modal" onClick={(event) => event.stopPropagation()}>
            <div className="about-modal__header">
              <img
                className="about-modal__logo"
                src="/ghost-writer-logo.png"
                alt={`${appName} logo`}
                width="64"
                height="64"
              />
              <div className="about-modal__title-block">
                <h2 className="modal__title about-modal__app-name">{appName}</h2>
                <div className="about-modal__meta">Version {appVersion}</div>
                <div className="about-modal__meta">Vibe Coded by Jimmy Weber</div>
              </div>
            </div>
            <hr className="about-modal__divider" />
            <div className="about-modal__body">
              <p>
                Ghost Writer is a private, distraction-free markdown editor. It uses private, local LLMs to help you write.
              </p>
              <p>
                Browse different LLMs on the{' '}
                <a href="https://ollama.com/library" target="_blank" rel="noreferrer">
                  Ollama model library
                </a>{' '}
                and read the{' '}
                <a href="https://github.com/ollama/ollama/blob/main/README.md" target="_blank" rel="noreferrer">
                  Ollama docs
                </a>
                {' '}to learn more.
              </p>
              <p>Quick start to download a model:</p>
              <pre className="about-modal__code">ollama pull llama3.1:8b</pre>
              <p>Then restart Ghost Writer and you’re ready to write.</p>
            </div>
            <div className="modal__actions">
              <button type="button" className="modal__button modal__button--primary" onClick={() => setIsAboutOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
