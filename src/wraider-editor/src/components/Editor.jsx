import { useEffect, useMemo, useRef, useState } from 'react'

const DEFAULT_TEXT = `Welcome to Wraider.

Start writing here. Use Ctrl+Shift+A to open AI commands (placeholder for now).`

const PROMPT_FALLBACK_POSITION = { top: 120, left: 120 }

function Editor({ value, onChange, onPromptOpen, onSelectionChange, selectionRange, showSelectionOverlay }) {
  const textareaRef = useRef(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [contentHeight, setContentHeight] = useState(0)

  const selectionOverlay = useMemo(() => {
    if (!showSelectionOverlay) return null
    const text = value ?? ''
    const start = Math.min(selectionRange?.start ?? 0, selectionRange?.end ?? 0)
    const end = Math.max(selectionRange?.start ?? 0, selectionRange?.end ?? 0)
    if (start === end) return null
    const safeStart = Math.min(start, text.length)
    const safeEnd = Math.min(end, text.length)
    const selectionText = text.slice(safeStart, safeEnd)
    return {
      before: text.slice(0, safeStart),
      selection: selectionText.length ? selectionText : ' ',
      after: text.slice(safeEnd),
    }
  }, [selectionRange?.end, selectionRange?.start, showSelectionOverlay, value])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    setContentHeight(textarea.scrollHeight)
  }, [value])

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
    const handleSelectionUpdate = () => {
      const textarea = textareaRef.current
      if (!textarea) return
      onSelectionChange?.({
        selectionStart: textarea.selectionStart ?? 0,
        selectionEnd: textarea.selectionEnd ?? textarea.selectionStart ?? 0,
      })
    }

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
    const handleScroll = () => {
      if (!textarea) return
      setScrollTop(textarea.scrollTop)
      setContentHeight(textarea.scrollHeight)
    }

    if (textarea) {
      setContentHeight(textarea.scrollHeight)
    }

    textarea?.addEventListener('keydown', handleKeyDown)
    textarea?.addEventListener('mouseup', handleSelectionUpdate)
    textarea?.addEventListener('keyup', handleSelectionUpdate)
    textarea?.addEventListener('select', handleSelectionUpdate)
    textarea?.addEventListener('focus', handleSelectionUpdate)
    textarea?.addEventListener('blur', handleSelectionUpdate)
    textarea?.addEventListener('scroll', handleScroll)

    return () => {
      textarea?.removeEventListener('keydown', handleKeyDown)
      textarea?.removeEventListener('mouseup', handleSelectionUpdate)
      textarea?.removeEventListener('keyup', handleSelectionUpdate)
      textarea?.removeEventListener('select', handleSelectionUpdate)
      textarea?.removeEventListener('focus', handleSelectionUpdate)
      textarea?.removeEventListener('blur', handleSelectionUpdate)
      textarea?.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <section className="editor">
      <div className="editor__field">
        {selectionOverlay && (
          <div
            className="editor__selection-overlay"
            style={{ transform: `translateY(${-scrollTop}px)`, minHeight: contentHeight || '100%' }}
            aria-hidden="true"
          >
            <span className="editor__selection-overlay-text">{selectionOverlay.before}</span>
            <mark className="editor__selection-overlay-highlight">{selectionOverlay.selection}</mark>
            <span className="editor__selection-overlay-text">{selectionOverlay.after}</span>
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="editor__textarea"
          value={value ?? DEFAULT_TEXT}
          onChange={(event) => onChange(event.target.value)}
          onScroll={(event) => setScrollTop(event.target.scrollTop)}
          onSelect={(event) => {
            const target = event.target
            onSelectionChange?.({
              selectionStart: target.selectionStart ?? 0,
              selectionEnd: target.selectionEnd ?? target.selectionStart ?? 0,
            })
          }}
          spellCheck="true"
        />
      </div>
    </section>
  )
}

export default Editor