import { useEffect, useRef, useState } from 'react'
import './App.css'
import Editor from './components/Editor'

const DEFAULT_TEXT = `Welcome to Wraider.

Start writing here. Use Ctrl+Shift+A to open AI commands (placeholder for now).`

function App() {
  const [theme, setTheme] = useState('light')
  const [content, setContent] = useState(DEFAULT_TEXT)
  const [isSaveOpen, setIsSaveOpen] = useState(false)
  const [fileName, setFileName] = useState('wraider-document.md')
  const [isPromptOpen, setIsPromptOpen] = useState(false)
  const [promptText, setPromptText] = useState('')
  const [promptResponse, setPromptResponse] = useState('')
  const [promptError, setPromptError] = useState('')
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState('')
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false)
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [modelError, setModelError] = useState('')
  const [promptPosition, setPromptPosition] = useState({ top: 120, left: 120 })
  const isDark = theme === 'dark'
  const fileInputRef = useRef(null)

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

  useEffect(() => {
    if (!isPromptOpen) return

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsPromptOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isPromptOpen])

  const handleNew = () => {
    if (content.trim().length === 0 || window.confirm('Start a new document? Unsaved changes will be lost.')) {
      setContent('')
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
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const handlePromptOpen = (position) => {
    if (position) {
      setPromptPosition(position)
    }
    setPromptError('')
    setPromptResponse('')
    setIsPromptOpen(true)
  }

  const handlePromptClose = () => {
    setIsPromptOpen(false)
  }

  const handlePromptSubmit = async (event) => {
    event.preventDefault()
    if (!promptText.trim()) return

    setIsLoadingPrompt(true)
    setPromptError('')
    setPromptResponse('')

    try {
      if (!selectedModel) {
        throw new Error('Please select a model to continue.')
      }

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt: `${promptText}\n\n---\n\n${content}`,
          stream: false,
        }),
      })

      if (!response.ok) {
        throw new Error('Ollama request failed. Is the server running?')
      }

      const data = await response.json()
      const generatedText = data?.response
      if (!generatedText) {
        throw new Error('No response received from Ollama.')
      }

      setPromptResponse(generatedText)
    } catch (error) {
      setPromptError(error?.message ?? 'Unable to reach Ollama.')
    } finally {
      setIsLoadingPrompt(false)
    }
  }

  return (
    <div className={`app${isDark ? ' app--dark' : ''}`}>
      <header className="app__header">
        <div className="app__header-row">
          <div>
            <h1>Wraider</h1>
            <p className="app__subtitle">AI-assisted writing, powered by Ollama.</p>
          </div>
          <div className="app__controls">
            <div className="doc-actions">
              <button type="button" className="doc-actions__button" onClick={handleNew}>
                New
              </button>
              <button type="button" className="doc-actions__button" onClick={handleSaveClick}>
                Save
              </button>
              <button type="button" className="doc-actions__button" onClick={handleLoadClick}>
                Load
              </button>
              <input
                ref={fileInputRef}
                className="doc-actions__file"
                type="file"
                accept=".md,text/markdown,text/plain"
                onChange={handleLoadFile}
              />
            </div>
            <button
              type="button"
              className="theme-toggle"
              aria-pressed={isDark}
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            >
              {isDark ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
        </div>
      </header>
      <main className="app__main">
        <Editor value={content} onChange={setContent} onPromptOpen={handlePromptOpen} />
        {(promptResponse || promptError) && (
          <section className={`prompt-response${isDark ? ' prompt-response--dark' : ''}`}>
            <div className="prompt-response__header">
              <h2>Ollama Response</h2>
              <button
                type="button"
                className="prompt-response__clear"
                onClick={() => {
                  setPromptResponse('')
                  setPromptError('')
                }}
              >
                Clear
              </button>
            </div>
            {promptError ? (
              <p className="prompt-response__error">{promptError}</p>
            ) : (
              <pre className="prompt-response__content">{promptResponse}</pre>
            )}
          </section>
        )}
      </main>
      {isPromptOpen && (
        <div
          className={`prompt-overlay${isDark ? ' prompt-overlay--dark' : ''}`}
          style={{ top: promptPosition.top, left: promptPosition.left }}
        >
          <div className="prompt-overlay__header">
            <span className="prompt-overlay__title">Ask Wraider</span>
            <button type="button" className="prompt-overlay__close" onClick={handlePromptClose}>
              ×
            </button>
          </div>
          <form className="prompt-overlay__form" onSubmit={handlePromptSubmit}>
            <label className="prompt-overlay__label" htmlFor="modelSelect">
              Model
            </label>
            <select
              id="modelSelect"
              className="prompt-overlay__select"
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
            {modelError && (
              <div className="prompt-overlay__status prompt-overlay__status--error">{modelError}</div>
            )}
            <label className="prompt-overlay__label" htmlFor="promptText">
              Prompt
            </label>
            <textarea
              id="promptText"
              className="prompt-overlay__textarea"
              value={promptText}
              onChange={(event) => setPromptText(event.target.value)}
              placeholder="Ask the AI to help with your writing..."
              rows={4}
            />
            <div className="prompt-overlay__actions">
              <button type="button" className="prompt-overlay__button" onClick={handlePromptClose}>
                Close
              </button>
              <button
                type="submit"
                className="prompt-overlay__button prompt-overlay__button--primary"
                disabled={isLoadingPrompt || isLoadingModels || !promptText.trim() || !selectedModel}
              >
                {isLoadingPrompt ? 'Sending...' : 'Send'}
              </button>
            </div>
            {promptError && (
              <div className="prompt-overlay__status prompt-overlay__status--error">{promptError}</div>
            )}
          </form>
        </div>
      )}
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
