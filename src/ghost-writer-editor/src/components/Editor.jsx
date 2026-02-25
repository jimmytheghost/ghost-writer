import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { extractInlinePromptTokens } from '../lib/contentTransforms'
import { getMisspelledRanges } from '../lib/spellcheck'

const INDENT_UNIT = '  '
const LIST_ITEM_PATTERN = /^(\s*)([-*+]|\d+\.)\s(?:\[(?: |x|X)\]\s)?(.*)$/

function Editor({
  value,
  onChange,
  onPromptOpen,
  onSelectionChange,
  selectionRange,
  showSelectionOverlay,
  spellCheckEnabled = false,
  textZoomPercent = 100,
}) {
  const textareaRef = useRef(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [contentHeight, setContentHeight] = useState(0)
  const misspelledRanges = useMemo(() => {
    if (!spellCheckEnabled) return []
    return getMisspelledRanges(value ?? '')
  }, [spellCheckEnabled, value])

  const spellCheckOverlay = useMemo(() => {
    if (!spellCheckEnabled) return null
    if (!misspelledRanges.length) return null

    const text = value ?? ''
    const nodes = []
    let cursor = 0

    misspelledRanges.forEach((range, index) => {
      const start = Math.max(0, Math.min(range.start, text.length))
      const end = Math.max(start, Math.min(range.end, text.length))
      if (start > cursor) {
        nodes.push(
          <span key={`spell-text-${index}-${cursor}`} className="editor__spell-overlay-text">
            {text.slice(cursor, start)}
          </span>,
        )
      }
      nodes.push(
        <span key={`spell-error-${index}-${start}`} className="editor__spell-overlay-error">
          {text.slice(start, end)}
        </span>,
      )
      cursor = end
    })

    if (cursor < text.length) {
      nodes.push(
        <span key={`spell-text-tail-${cursor}`} className="editor__spell-overlay-text">
          {text.slice(cursor)}
        </span>,
      )
    }

    return nodes
  }, [misspelledRanges, spellCheckEnabled, value])

  const inlinePromptOverlay = useMemo(() => {
    const text = value ?? ''
    const tokens = extractInlinePromptTokens(text)
    if (!tokens.length) return null

    const nodes = []
    let cursor = 0

    tokens.forEach((token, index) => {
      const start = Math.max(0, Math.min(token.start, text.length))
      const end = Math.max(start, Math.min(token.end, text.length))

      if (start > cursor) {
        nodes.push(
          <span key={`inline-text-${index}-${cursor}`} className="editor__inline-prompt-overlay-text">
            {text.slice(cursor, start)}
          </span>,
        )
      }

      nodes.push(
        <span key={`inline-token-${index}-${start}`} className="editor__inline-prompt-overlay-token">
          {text.slice(start, end)}
        </span>,
      )

      cursor = end
    })

    if (cursor < text.length) {
      nodes.push(
        <span key={`inline-text-tail-${cursor}`} className="editor__inline-prompt-overlay-text">
          {text.slice(cursor)}
        </span>,
      )
    }

    return nodes
  }, [value])

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

      if (event.key === '-' && !event.metaKey && !event.ctrlKey && !event.altKey && !event.isComposing) {
        event.preventDefault()
        const nextValue = `${text.slice(0, start)}-${text.slice(end)}`
        const nextPosition = start + 1
        onChange?.(nextValue)
        requestAnimationFrame(() => {
          textarea.focus()
          textarea.setSelectionRange(nextPosition, nextPosition)
          onSelectionChange?.({ selectionStart: nextPosition, selectionEnd: nextPosition })
        })
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

  const handleTextareaChange = (event) => {
    const target = event.target
    const inputValue = target.value
    const selectionStart = target.selectionStart ?? inputValue.length
    const previousValue = value ?? ''
    const smartDashWindowStart = Math.max(0, selectionStart - 6)
    const smartDashWindowEnd = Math.min(inputValue.length, selectionStart + 2)
    const smartDashWindow = inputValue.slice(smartDashWindowStart, smartDashWindowEnd)
    const localIndex = Math.max(smartDashWindow.lastIndexOf('—'), smartDashWindow.lastIndexOf('–'))

    if (localIndex === -1) {
      onChange(inputValue)
      return
    }

    const absoluteIndex = smartDashWindowStart + localIndex
    const matchedDash = inputValue[absoluteIndex]
    const collapseAmount = Math.max(0, previousValue.length - inputValue.length)
    const replacement = matchedDash === '—' ? (collapseAmount >= 1 ? '---' : '--') : '-'
    const nextValue = `${inputValue.slice(0, absoluteIndex)}${replacement}${inputValue.slice(absoluteIndex + 1)}`
    const lengthDelta = replacement.length - 1
    const nextPosition = absoluteIndex < selectionStart ? selectionStart + lengthDelta : selectionStart
    const resolvedPosition = Math.max(0, Math.min(nextPosition, nextValue.length))

    onChange(nextValue)

    requestAnimationFrame(() => {
      target.focus()
      target.setSelectionRange(resolvedPosition, resolvedPosition)
      onSelectionChange?.({
        selectionStart: resolvedPosition,
        selectionEnd: resolvedPosition,
      })
    })
  }

  const editorTextStyle = useMemo(() => {
    const normalized = Number.isFinite(Number(textZoomPercent)) ? Number(textZoomPercent) : 100
    return {
      fontSize: `calc(var(--font-size-base) * ${normalized / 100})`,
    }
  }, [textZoomPercent])

  return (
    <section className="editor">
      <div className="editor__field">
        {spellCheckOverlay && (
          <div
            className="editor__spell-overlay"
            style={{
              transform: `translateY(${-scrollTop}px)`,
              minHeight: contentHeight || '100%',
              ...editorTextStyle,
            }}
            aria-hidden="true"
          >
            {spellCheckOverlay}
          </div>
        )}
        {inlinePromptOverlay && (
          <div
            className="editor__inline-prompt-overlay"
            style={{
              transform: `translateY(${-scrollTop}px)`,
              minHeight: contentHeight || '100%',
              ...editorTextStyle,
            }}
            aria-hidden="true"
          >
            {inlinePromptOverlay}
          </div>
        )}
        {selectionOverlay && (
          <div
            className="editor__selection-overlay"
            style={{
              transform: `translateY(${-scrollTop}px)`,
              minHeight: contentHeight || '100%',
              ...editorTextStyle,
            }}
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
          style={editorTextStyle}
          onChange={handleTextareaChange}
          onBeforeInput={(event) => {
            const nativeEvent = event.nativeEvent
            if (nativeEvent?.inputType !== 'insertText') return
            if (nativeEvent?.data !== '—' && nativeEvent?.data !== '–') return

            event.preventDefault()
            const target = event.target
            if (!(target instanceof HTMLTextAreaElement)) return

            const start = target.selectionStart ?? 0
            const end = target.selectionEnd ?? start
            const text = value ?? ''
            const replacement = nativeEvent?.data === '—' ? '--' : '-'
            const nextValue = `${text.slice(0, start)}${replacement}${text.slice(end)}`
            const nextPosition = start + replacement.length
            onChange(nextValue)

            requestAnimationFrame(() => {
              target.focus()
              target.setSelectionRange(nextPosition, nextPosition)
              onSelectionChange?.({
                selectionStart: nextPosition,
                selectionEnd: nextPosition,
              })
            })
          }}
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
          spellCheck={spellCheckEnabled}
          lang="en-US"
          data-gramm="false"
          data-lt-active="false"
        />
      </div>
    </section>
  )
}

export default Editor
