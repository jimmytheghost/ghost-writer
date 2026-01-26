import { useEffect, useRef, useState } from 'react'

const DEFAULT_TEXT = `Welcome to Wraider.

Start writing here. Use Ctrl+Shift+A to open AI commands (placeholder for now).`

function Editor() {
  const [content, setContent] = useState(DEFAULT_TEXT)
  const textareaRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        window.alert('AI prompt shortcut triggered. (Placeholder)')
      }

      if (event.ctrlKey && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        window.alert('Bold shortcut placeholder')
      }

      if (event.ctrlKey && event.key.toLowerCase() === 'i') {
        event.preventDefault()
        window.alert('Italic shortcut placeholder')
      }
    }

    const textarea = textareaRef.current
    textarea?.addEventListener('keydown', handleKeyDown)
    return () => textarea?.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <section className="editor">
      <textarea
        ref={textareaRef}
        className="editor__textarea"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        spellCheck="true"
      />
      <div className="editor__hint">
        Tip: Press <strong>Ctrl+Shift+A</strong> to open the AI prompt box (coming soon).
      </div>
    </section>
  )
}

export default Editor