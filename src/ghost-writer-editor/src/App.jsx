import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import bundledModelSnapshot from './generated/ollama-models.json'
import AppModals from './components/AppModals'
import Editor from './components/Editor'
import FooterBar from './components/FooterBar'
import PromptPanel from './components/PromptPanel'
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
  try {
    return window.localStorage.getItem(ALWAYS_ON_TOP_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
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
    reader.onerror = () => {
      setPromptError('Unable to read the selected file.')
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
      try {
        window.localStorage.setItem(ALWAYS_ON_TOP_STORAGE_KEY, String(nextValue))
      } catch {
        // Continue even if storage is unavailable.
      }
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
            selectedModel={selectedModel}
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
        setTheme={setTheme}
        isAlwaysOnTop={isAlwaysOnTop}
        handleAlwaysOnTopToggle={handleAlwaysOnTopToggle}
      />
      <input
        ref={fileInputRef}
        className="doc-actions__file"
        type="file"
        accept={".md,text/markdown,text/plain"}
        onChange={handleLoadFile}
      />
      <AppModals
        isSaveOpen={isSaveOpen}
        setIsSaveOpen={setIsSaveOpen}
        fileName={fileName}
        setFileName={setFileName}
        handleSaveConfirm={handleSaveConfirm}
        isNewConfirmOpen={isNewConfirmOpen}
        setIsNewConfirmOpen={setIsNewConfirmOpen}
        handleConfirmNew={handleConfirmNew}
        isAboutOpen={isAboutOpen}
        setIsAboutOpen={setIsAboutOpen}
        appName={appName}
        appVersion={appVersion}
      />
    </div>
  )
}

export default App
