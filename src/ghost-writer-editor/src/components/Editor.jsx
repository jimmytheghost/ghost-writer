import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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

  const applyInlineFormat = useCallback(
    (marker) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart ?? 0
      const end = textarea.selectionEnd ?? start
      const text = value ?? ''
      const selected = text.slice(start, end)
      const hasSelection = start !== end
      const replacement = hasSelection ? `${marker}${selected}${marker}` : `${marker}${marker}`
      const nextValue = `${text.slice(0, start)}${replacement}${text.slice(end)}`
      const nextSelectionStart = start + marker.length
      const nextSelectionEnd = hasSelection ? end + marker.length : nextSelectionStart

      onChange?.(nextValue)

      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(nextSelectionStart, nextSelectionEnd)
        onSelectionChange?.({
          selectionStart: nextSelectionStart,
          selectionEnd: nextSelectionEnd,
        })
      })
    },
    [onChange, onSelectionChange, value],
  )

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
      const isMac = /Mac/.test(navigator.platform)
      const isMod = isMac ? event.metaKey : event.ctrlKey
      const key = event.key.toLowerCase()

      if (isMod && event.shiftKey && key === 'k') {
        event.preventDefault()
        const selection = getSelectionRange()
        onPromptOpen?.(selection)
      }

      if (isMod && !event.shiftKey && key === 'b') {
        event.preventDefault()
        applyInlineFormat('**')
      }

      if (isMod && !event.shiftKey && key === 'i') {
        event.preventDefault()
        applyInlineFormat('*')
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
  }, [applyInlineFormat, onPromptOpen, onSelectionChange])

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
          value={value ?? ''}
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
