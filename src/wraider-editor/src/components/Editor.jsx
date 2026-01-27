import { useEffect, useRef } from 'react'

const DEFAULT_TEXT = `Welcome to Wraider.

Start writing here. Use Ctrl+Shift+A to open AI commands (placeholder for now).`

const PROMPT_FALLBACK_POSITION = { top: 120, left: 120 }

function Editor({ value, onChange, onPromptOpen }) {
  const textareaRef = useRef(null)

  const getCursorPosition = () => {
    const textarea = textareaRef.current
    if (!textarea) return PROMPT_FALLBACK_POSITION

    const rect = textarea.getBoundingClientRect()
    const lineHeight = 24
    const paddingTop = 16
    const paddingLeft = 16
    const selectionIndex = textarea.selectionStart ?? 0
    const textBeforeCursor = textarea.value.slice(0, selectionIndex)
    const lines = textBeforeCursor.split('\n')
    const lineCount = lines.length
    const lastLineLength = lines[lines.length - 1]?.length ?? 0
    const approxTop = rect.top + paddingTop + (lineCount - 1) * lineHeight
    const approxLeft = rect.left + paddingLeft + Math.min(lastLineLength * 7.2, rect.width - 260)

    return {
      top: Math.min(approxTop + window.scrollY, rect.bottom + window.scrollY - 120),
      left: Math.min(approxLeft + window.scrollX, rect.right + window.scrollX - 260),
    }
  }

  const getSelectionRange = () => {
    const textarea = textareaRef.current
    if (!textarea) {
      return { selectionStart: 0, selectionEnd: 0 }
    }

    return {
      selectionStart: textarea.selectionStart ?? 0,
      selectionEnd: textarea.selectionEnd ?? textarea.selectionStart ?? 0,
    }
  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.metaKey && event.shiftKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        const position = getCursorPosition()
        const selection = getSelectionRange()
        onPromptOpen?.({ position, ...selection })
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
        value={value ?? DEFAULT_TEXT}
        onChange={(event) => onChange(event.target.value)}
        spellCheck="true"
      />
    </section>
  )
}

export default Editor