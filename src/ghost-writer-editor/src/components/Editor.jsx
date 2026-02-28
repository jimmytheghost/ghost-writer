import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { extractInlinePromptOverlayRanges } from '../lib/contentTransforms'
import { getMisspelledRanges, isSpellcheckReady, preloadSpellcheck } from '../lib/spellcheck'

const INDENT_UNIT = '  '
const OVERLAY_HEAVY_TEXT_LIMIT = 120_000
const OVERLAY_HEAVY_LINE_LIMIT = 2_500
const LIST_ITEM_PATTERN = /^(\s*)([-*+]|\d+\.)\s(?:\[(?: |x|X)\]\s)?(.*)$/
const INLINE_TOKEN_PATTERN =
  /!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|<https?:\/\/[^>]+>|~~[^~]+~~|\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_/g

function pushPlain(nodes, text, keyPrefix) {
  if (!text) return
  nodes.push(
    <span key={`${keyPrefix}-plain-${nodes.length}`} className="editor__syntax-text">
      {text}
    </span>,
  )
}

function appendInlineSyntax(nodes, text, keyPrefix) {
  let cursor = 0
  INLINE_TOKEN_PATTERN.lastIndex = 0
  let match = INLINE_TOKEN_PATTERN.exec(text)

  while (match) {
    const token = match[0]
    const start = match.index ?? 0
    const end = start + token.length
    pushPlain(nodes, text.slice(cursor, start), keyPrefix)

    if (token.startsWith('![')) {
      const image = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(token)
      if (image) {
        nodes.push(
          <span key={`${keyPrefix}-img-open-${nodes.length}`} className="editor__syntax-punct">
            ![
          </span>,
          <span key={`${keyPrefix}-img-label-${nodes.length}`} className="editor__syntax-link-label">
            {image[1]}
          </span>,
          <span key={`${keyPrefix}-img-mid-${nodes.length}`} className="editor__syntax-punct">
            ](
          </span>,
          <span key={`${keyPrefix}-img-url-${nodes.length}`} className="editor__syntax-link-url">
            {image[2]}
          </span>,
          <span key={`${keyPrefix}-img-close-${nodes.length}`} className="editor__syntax-punct">
            )
          </span>,
        )
      } else {
        pushPlain(nodes, token, keyPrefix)
      }
    } else if (token.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      if (link) {
        nodes.push(
          <span key={`${keyPrefix}-lnk-open-${nodes.length}`} className="editor__syntax-punct">
            [
          </span>,
          <span key={`${keyPrefix}-lnk-label-${nodes.length}`} className="editor__syntax-link-label">
            {link[1]}
          </span>,
          <span key={`${keyPrefix}-lnk-mid-${nodes.length}`} className="editor__syntax-punct">
            ](
          </span>,
          <span key={`${keyPrefix}-lnk-url-${nodes.length}`} className="editor__syntax-link-url">
            {link[2]}
          </span>,
          <span key={`${keyPrefix}-lnk-close-${nodes.length}`} className="editor__syntax-punct">
            )
          </span>,
        )
      } else {
        pushPlain(nodes, token, keyPrefix)
      }
    } else if (token.startsWith('<http')) {
      nodes.push(
        <span key={`${keyPrefix}-auto-${nodes.length}`} className="editor__syntax-link-url">
          {token}
        </span>,
      )
    } else if (token.startsWith('~~')) {
      nodes.push(
        <span key={`${keyPrefix}-strike-${nodes.length}`} className="editor__syntax-strikethrough">
          {token}
        </span>,
      )
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(
        <span key={`${keyPrefix}-strong-${nodes.length}`} className="editor__syntax-strong">
          {token}
        </span>,
      )
    } else {
      nodes.push(
        <span key={`${keyPrefix}-em-${nodes.length}`} className="editor__syntax-emphasis">
          {token}
        </span>,
      )
    }

    cursor = end
    match = INLINE_TOKEN_PATTERN.exec(text)
  }

  pushPlain(nodes, text.slice(cursor), keyPrefix)
}

function renderSyntaxLine(line, lineIndex) {
  const nodes = []
  const keyPrefix = `syntax-${lineIndex}`

  const heading = /^(\s{0,3})(#{1,6})(\s+)(.*)$/.exec(line)
  if (heading) {
    pushPlain(nodes, heading[1], keyPrefix)
    nodes.push(
      <span key={`${keyPrefix}-hmark`} className="editor__syntax-heading">
        {heading[2]}
      </span>,
      <span key={`${keyPrefix}-hspace`} className="editor__syntax-text">
        {heading[3]}
      </span>,
      <span key={`${keyPrefix}-htext`} className="editor__syntax-heading">
        {heading[4]}
      </span>,
    )
    return nodes
  }

  const quote = /^(\s*)(>)(\s?)(.*)$/.exec(line)
  if (quote) {
    pushPlain(nodes, quote[1], keyPrefix)
    nodes.push(
      <span key={`${keyPrefix}-quote`} className="editor__syntax-quote-marker">
        {quote[2]}
      </span>,
    )
    pushPlain(nodes, quote[3], keyPrefix)
    appendInlineSyntax(nodes, quote[4], keyPrefix)
    return nodes
  }

  const checkbox = /^(\s*)([-+*])(\s+)\[([ xX])\](\s+)(.*)$/.exec(line)
  if (checkbox) {
    pushPlain(nodes, checkbox[1], keyPrefix)
    nodes.push(
      <span key={`${keyPrefix}-cbbullet`} className="editor__syntax-list-marker">
        {checkbox[2]}
      </span>,
    )
    pushPlain(nodes, checkbox[3], keyPrefix)
    nodes.push(
      <span key={`${keyPrefix}-cbopen`} className="editor__syntax-punct">
        [
      </span>,
      <span
        key={`${keyPrefix}-cbmark`}
        className={checkbox[4].toLowerCase() === 'x' ? 'editor__syntax-checkbox-done' : 'editor__syntax-punct'}
      >
        {checkbox[4]}
      </span>,
      <span key={`${keyPrefix}-cbclose`} className="editor__syntax-punct">
        ]
      </span>,
    )
    pushPlain(nodes, checkbox[5], keyPrefix)
    appendInlineSyntax(nodes, checkbox[6], keyPrefix)
    return nodes
  }

  const list = /^(\s*)([-+*])(\s+)(.*)$/.exec(line)
  if (list) {
    pushPlain(nodes, list[1], keyPrefix)
    nodes.push(
      <span key={`${keyPrefix}-list`} className="editor__syntax-list-marker">
        {list[2]}
      </span>,
    )
    pushPlain(nodes, list[3], keyPrefix)
    appendInlineSyntax(nodes, list[4], keyPrefix)
    return nodes
  }

  appendInlineSyntax(nodes, line, keyPrefix)
  return nodes
}

function Editor({
  value,
  onChange,
  onPromptOpen,
  onSelectionChange,
  onScrollPositionChange,
  selectionRange,
  externalSelectionRange,
  externalScrollTop,
  focusRequestId = 0,
  showSelectionOverlay,
  spellCheckEnabled = false,
  textZoomPercent = 100,
}) {
  const textareaRef = useRef(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [contentHeight, setContentHeight] = useState(0)
  const [spellcheckReadyAt, setSpellcheckReadyAt] = useState(() => (isSpellcheckReady() ? 1 : 0))
  const text = value ?? ''
  const lineCount = useMemo(() => {
    if (!text) return 1
    return text.split('\n').length
  }, [text])
  const useLightweightOverlays =
    text.length > OVERLAY_HEAVY_TEXT_LIMIT || lineCount > OVERLAY_HEAVY_LINE_LIMIT

  useEffect(() => {
    if (!spellCheckEnabled || isSpellcheckReady()) return
    let isMounted = true
    void preloadSpellcheck().then((loaded) => {
      if (!loaded || !isMounted) return
      setSpellcheckReadyAt(Date.now())
    })
    return () => {
      isMounted = false
    }
  }, [spellCheckEnabled])

  const misspelledRanges = useMemo(() => {
    if (!spellCheckEnabled || !spellcheckReadyAt || useLightweightOverlays) return []
    return getMisspelledRanges(text)
  }, [spellCheckEnabled, spellcheckReadyAt, text, useLightweightOverlays])

  const spellCheckOverlay = useMemo(() => {
    if (!spellCheckEnabled) return null
    if (!misspelledRanges.length) return null

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
  }, [misspelledRanges, spellCheckEnabled, text])

  const inlinePromptOverlay = useMemo(() => {
    if (useLightweightOverlays) return null
    const ranges = extractInlinePromptOverlayRanges(text)
    if (!ranges.length) return null

    const nodes = []
    let cursor = 0

    ranges.forEach((range, index) => {
      const start = Math.max(0, Math.min(range.start, text.length))
      const end = Math.max(start, Math.min(range.end, text.length))

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
  }, [text, useLightweightOverlays])

  const selectionOverlay = useMemo(() => {
    if (!showSelectionOverlay || useLightweightOverlays) return null
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
  }, [selectionRange?.end, selectionRange?.start, showSelectionOverlay, text, useLightweightOverlays])

  const syntaxOverlay = useMemo(() => {
    if (useLightweightOverlays) return null
    const lines = text.split('\n')
    const nodes = []

    lines.forEach((line, index) => {
      nodes.push(
        <span key={`syntax-line-${index}`} className="editor__syntax-line">
          {renderSyntaxLine(line, index)}
        </span>,
      )
      if (index < lines.length - 1) {
        nodes.push(
          <span key={`syntax-break-${index}`} className="editor__syntax-text">
            {'\n'}
          </span>,
        )
      }
    })

    return nodes
  }, [text, useLightweightOverlays])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    setContentHeight(textarea.scrollHeight)
    onScrollPositionChange?.({
      scrollTop: textarea.scrollTop,
      scrollHeight: textarea.scrollHeight,
      clientHeight: textarea.clientHeight,
    })
  }, [value])

  useEffect(() => {
    if (!Number.isFinite(Number(externalScrollTop))) return
    const textarea = textareaRef.current
    if (!textarea) return

    const nextScrollTop = Math.max(0, Number(externalScrollTop))
    if (Math.abs((textarea.scrollTop ?? 0) - nextScrollTop) < 1) return

    textarea.scrollTop = nextScrollTop
    setScrollTop(nextScrollTop)
    setContentHeight(textarea.scrollHeight)
    onScrollPositionChange?.({
      scrollTop: nextScrollTop,
      scrollHeight: textarea.scrollHeight,
      clientHeight: textarea.clientHeight,
    })
  }, [externalScrollTop, onScrollPositionChange])

  useEffect(() => {
    if (!externalSelectionRange) return
    const textarea = textareaRef.current
    if (!textarea) return

    const nextStart = Math.max(
      0,
      Math.min(
        Number.isFinite(Number(externalSelectionRange.start)) ? Number(externalSelectionRange.start) : 0,
        (value ?? '').length,
      ),
    )
    const nextEnd = Math.max(
      0,
      Math.min(
        Number.isFinite(Number(externalSelectionRange.end)) ? Number(externalSelectionRange.end) : nextStart,
        (value ?? '').length,
      ),
    )

    if (textarea.selectionStart === nextStart && textarea.selectionEnd === nextEnd) return
    textarea.setSelectionRange(nextStart, nextEnd)
  }, [externalSelectionRange, value])

  useEffect(() => {
    if (!focusRequestId) return
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.focus()
  }, [focusRequestId])

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

      const isSpaceKey = event.key === ' ' || event.key === 'Spacebar' || event.code === 'Space'
      if (isSpaceKey && !event.metaKey && !event.ctrlKey && !event.altKey && !event.isComposing) {
        event.preventDefault()
        const nextValue = `${text.slice(0, start)} ${text.slice(end)}`
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
    if (textarea) {
      setContentHeight(textarea.scrollHeight)
    }

    textarea?.addEventListener('keydown', handleKeyDown)
    textarea?.addEventListener('mouseup', handleSelectionUpdate)
    textarea?.addEventListener('keyup', handleSelectionUpdate)
    textarea?.addEventListener('select', handleSelectionUpdate)
    textarea?.addEventListener('focus', handleSelectionUpdate)
    textarea?.addEventListener('blur', handleSelectionUpdate)

    return () => {
      textarea?.removeEventListener('keydown', handleKeyDown)
      textarea?.removeEventListener('mouseup', handleSelectionUpdate)
      textarea?.removeEventListener('keyup', handleSelectionUpdate)
      textarea?.removeEventListener('select', handleSelectionUpdate)
      textarea?.removeEventListener('focus', handleSelectionUpdate)
      textarea?.removeEventListener('blur', handleSelectionUpdate)
    }
  }, [applyInlineFormat, onChange, onPromptOpen, onSelectionChange, value])

  const handleTextareaChange = (event) => {
    const target = event.target
    const inputValue = target.value
    const previousValue = value ?? ''

    if (!inputValue.includes('—') && !inputValue.includes('–')) {
      onChange(inputValue)
      return
    }

    let didRestore = false
    const restoredValue = Array.from(inputValue)
      .map((char, index) => {
        if (char !== '—' && char !== '–') return char

        let runStart = index
        while (runStart > 0 && previousValue[runStart - 1] === '-') {
          runStart -= 1
        }
        let runEnd = index
        while (runEnd < previousValue.length && previousValue[runEnd] === '-') {
          runEnd += 1
        }
        const runLength = runEnd - runStart
        if (runLength < 2) return char
        didRestore = true
        return '-'.repeat(runLength)
      })
      .join('')

    if (!didRestore) {
      onChange(inputValue)
      return
    }

    const selectionStart = target.selectionStart ?? inputValue.length
    const caretDelta = restoredValue.length - inputValue.length
    const nextPosition = Math.max(0, Math.min(selectionStart + caretDelta, restoredValue.length))

    onChange(restoredValue)

    requestAnimationFrame(() => {
      target.focus()
      target.setSelectionRange(nextPosition, nextPosition)
      onSelectionChange?.({
        selectionStart: nextPosition,
        selectionEnd: nextPosition,
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
        {!useLightweightOverlays && (
          <div
            className="editor__syntax-overlay"
            style={{
              transform: `translateY(${-scrollTop}px)`,
              minHeight: contentHeight || '100%',
              ...editorTextStyle,
            }}
            aria-hidden="true"
          >
            {syntaxOverlay}
          </div>
        )}
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
          className="editor__textarea editor__textarea--syntax"
          value={value ?? ''}
          style={editorTextStyle}
          onChange={handleTextareaChange}
          onBeforeInput={(event) => {
            const nativeEvent = event.nativeEvent
            const inputType = nativeEvent?.inputType
            const inputData = nativeEvent?.data
            if (inputType === 'insertReplacementText') {
              event.preventDefault()
              return
            }
            if (inputData !== '—' && inputData !== '–') return
            event.preventDefault()
          }}
          onScroll={(event) => {
            const target = event.target
            setScrollTop(target.scrollTop)
            setContentHeight(target.scrollHeight)
            onScrollPositionChange?.({
              scrollTop: target.scrollTop,
              scrollHeight: target.scrollHeight,
              clientHeight: target.clientHeight,
            })
          }}
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
