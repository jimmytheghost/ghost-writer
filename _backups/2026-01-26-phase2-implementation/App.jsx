import { useRef, useState } from 'react'
import './App.css'
import Editor from './components/Editor'

const DEFAULT_TEXT = `Welcome to Wraider.

Start writing here. Use Ctrl+Shift+A to open AI commands (placeholder for now).`

function App() {
  const [theme, setTheme] = useState('light')
  const [content, setContent] = useState(DEFAULT_TEXT)
  const [isSaveOpen, setIsSaveOpen] = useState(false)
  const [fileName, setFileName] = useState('wraider-document.md')
  const isDark = theme === 'dark'
  const fileInputRef = useRef(null)

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
        <Editor value={content} onChange={setContent} />
      </main>
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
