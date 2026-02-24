import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const INDENT_UNIT = '  '
const LIST_ITEM_PATTERN = /^(\s*)([-*+]|\d+\.)\s(?:\[(?: |x|X)\]\s)?(.*)$/

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
      const textarea = textareaRef.current
      if (!textarea) return

      const text = value ?? ''
      const start = textarea.selectionStart ?? 0
      const end = textarea.selectionEnd ?? start
      const hasRangeSelection = start !== end
      const lineStart = text.lastIndexOf('\n', Math.max(start - 1, 0)) + 1
      const lineEndBoundary = text.indexOf('\n', start)
      const lineEnd = lineEndBoundary === -1 ? text.length : lineEndBoundary
      const lineText = text.slice(lineStart, lineEnd)
      const listMatch = lineText.match(LIST_ITEM_PATTERN)

      if (event.key === 'Enter' && !hasRangeSelection && listMatch) {
        event.preventDefault()
        const [, indentation, marker, itemText] = listMatch
        const beforeLine = text.slice(0, lineStart)
        const afterLine = text.slice(lineEnd)
        const isEmptyItem = itemText.trim().length === 0

        if (isEmptyItem) {
          const nextValue = `${beforeLine}${indentation}\n${afterLine.startsWith('\n') ? afterLine.slice(1) : afterLine}`
          const nextPosition = lineStart + indentation.length + 1
          onChange?.(nextValue)
          requestAnimationFrame(() => {
            textarea.focus()
            textarea.setSelectionRange(nextPosition, nextPosition)
            onSelectionChange?.({ selectionStart: nextPosition, selectionEnd: nextPosition })
          })
          return
        }

        const nextMarker = marker.endsWith('.')
          ? `${Number.parseInt(marker, 10) + 1}.`
          : marker
        const inserted = `\n${indentation}${nextMarker} `
        const nextValue = `${text.slice(0, end)}${inserted}${text.slice(end)}`
        const nextPosition = end + inserted.length
        onChange?.(nextValue)
        requestAnimationFrame(() => {
          textarea.focus()
          textarea.setSelectionRange(nextPosition, nextPosition)
          onSelectionChange?.({ selectionStart: nextPosition, selectionEnd: nextPosition })
        })
        return
      }

      if (event.key === 'Backspace' && !hasRangeSelection && listMatch) {
        const [, indentation] = listMatch
        const markerOffset = lineStart + indentation.length
        if ((start === markerOffset || start === lineStart) && indentation.length > 0) {
          event.preventDefault()
          const removeCount = Math.min(INDENT_UNIT.length, indentation.length)
          const nextValue = `${text.slice(0, lineStart)}${indentation.slice(removeCount)}${text.slice(markerOffset)}`
          const nextPosition = Math.max(lineStart, start - removeCount)
          onChange?.(nextValue)
          requestAnimationFrame(() => {
            textarea.focus()
            textarea.setSelectionRange(nextPosition, nextPosition)
            onSelectionChange?.({ selectionStart: nextPosition, selectionEnd: nextPosition })
          })
          return
        }
      }

      if (event.key === 'Tab') {
        event.preventDefault()
        const selectedText = text.slice(start, end)
        const hasMultiLineSelection = selectedText.includes('\n')

        if (!event.shiftKey && !hasMultiLineSelection && !hasRangeSelection) {
          const nextValue = `${text.slice(0, start)}${INDENT_UNIT}${text.slice(end)}`
          const nextPosition = start + INDENT_UNIT.length
          onChange?.(nextValue)

          requestAnimationFrame(() => {
            textarea.focus()
            textarea.setSelectionRange(nextPosition, nextPosition)
            onSelectionChange?.({
              selectionStart: nextPosition,
              selectionEnd: nextPosition,
            })
          })
          return
        }

        const blockEndIndex = end > 0 && text[end - 1] === '\n' ? end - 1 : end
        const blockLineEndBoundary = text.indexOf('\n', blockEndIndex)
        const blockLineEnd = blockLineEndBoundary === -1 ? text.length : blockLineEndBoundary
        const selectedBlock = text.slice(lineStart, blockLineEnd)
        const blockLines = selectedBlock.split('\n')

        let selectionStartShift = 0
        let selectionEndShift = 0
        const transformedLines = blockLines.map((line, lineIndex) => {
          if (!event.shiftKey) {
            selectionEndShift += INDENT_UNIT.length
            if (lineIndex === 0 && lineStart < start) selectionStartShift += INDENT_UNIT.length
            return `${INDENT_UNIT}${line}`
          }

          const removableCount =
            line.startsWith(INDENT_UNIT)
              ? INDENT_UNIT.length
              : line.startsWith(' ')
                ? 1
                : 0

          if (removableCount > 0) {
            selectionEndShift -= removableCount
            if (lineIndex === 0 && lineStart < start) {
              selectionStartShift -= Math.min(removableCount, start - lineStart)
            }
            return line.slice(removableCount)
          }

          return line
        })

        const transformedBlock = transformedLines.join('\n')
        const nextValue = `${text.slice(0, lineStart)}${transformedBlock}${text.slice(blockLineEnd)}`
        const nextSelectionStart = Math.max(lineStart, start + selectionStartShift)
        const nextSelectionEnd = Math.max(nextSelectionStart, end + selectionEndShift)

        onChange?.(nextValue)
        requestAnimationFrame(() => {
          textarea.focus()
          textarea.setSelectionRange(nextSelectionStart, nextSelectionEnd)
          onSelectionChange?.({
            selectionStart: nextSelectionStart,
            selectionEnd: nextSelectionEnd,
          })
        })
        return
      }

      const isMac = /Mac/.test(navigator.platform)
      const isMod = isMac ? event.metaKey : event.ctrlKey
      const key = event.key.toLowerCase()
      const isSystemEditShortcut = isMod && !event.altKey && ['c', 'v', 'x', 'z'].includes(key)

      if (isSystemEditShortcut) {
        return
      }

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
        return
      }

      const isBackquoteKey = event.code === 'Backquote' || key === '`' || key === '~'
      if (isMod && !event.altKey && isBackquoteKey) {
        event.preventDefault()
        applyInlineFormat('~~')
        return
      }

      if (isMod && event.shiftKey && key === 'x') {
        event.preventDefault()
        applyInlineFormat('~~')
        return
      }

      if (isMod && !event.shiftKey && key === 'a') {
        event.preventDefault()
        textarea.focus()
        textarea.setSelectionRange(0, (value ?? '').length)
        onSelectionChange?.({
          selectionStart: 0,
          selectionEnd: (value ?? '').length,
        })
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
  }, [applyInlineFormat, onChange, onPromptOpen, onSelectionChange, value])

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
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          data-gramm="false"
          data-lt-active="false"
        />
      </div>
    </section>
  )
}

export default Editor
