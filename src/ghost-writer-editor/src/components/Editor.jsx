import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { extractInlinePromptOverlayRanges } from '../lib/contentTransforms'
import { isMacDesktopRuntime, prepareMacosEditorInput, recordEditorDiagnostic } from '../lib/desktopRuntime'

const INDENT_UNIT = '  '
const OVERLAY_HEAVY_TEXT_LIMIT = 120_000
const OVERLAY_HEAVY_LINE_LIMIT = 2_500
const LIST_ITEM_PATTERN = /^(\s*)([-*+]|\d+\.)(\s+)(\[(?: |x|X)\]\s)?(.*)$/
const SELECTION_EVENT_NAMES = ['mouseup', 'keyup', 'select', 'focus', 'blur']
const INLINE_TOKEN_PATTERN =
  /!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|<https?:\/\/[^>]+>|~~[^~]+~~|\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_/g
const EM_DASH = '\u2014'
const EN_DASH = '\u2013'
const LEGACY_EM_DASH = 'â€”'
const LEGACY_EN_DASH = 'â€“'
const DIAGNOSTIC_CONTEXT_RADIUS = 24

function isMacPlatform() {
  return /Mac/.test(navigator.platform)
}

function isWindowsPlatform() {
  return /Win/i.test(navigator.platform)
}

function isModShortcut(event) {
  return isMacPlatform() ? event.metaKey : event.ctrlKey
}

function buildEditorDiagnosticSnapshot(target, fallbackValue = '') {
  const value = target?.value ?? fallbackValue ?? ''
  const selectionStart = target?.selectionStart ?? 0
  const selectionEnd = target?.selectionEnd ?? selectionStart
  const contextStart = Math.max(0, selectionStart - DIAGNOSTIC_CONTEXT_RADIUS)
  const contextEnd = Math.min(value.length, selectionEnd + DIAGNOSTIC_CONTEXT_RADIUS)

  return {
    selectionStart,
    selectionEnd,
    valueLength: value.length,
    contextBefore: value.slice(contextStart, selectionStart),
    selectedText: value.slice(selectionStart, selectionEnd),
    contextAfter: value.slice(selectionEnd, contextEnd),
  }
}

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

  const codeFence = /^(\s*)(```+)(.*)$/.exec(line)
  if (codeFence) {
    pushPlain(nodes, codeFence[1], keyPrefix)
    nodes.push(
      <span key={`${keyPrefix}-codefence`} className="editor__syntax-codefence">
        {codeFence[2]}
      </span>,
      <span key={`${keyPrefix}-codelang`} className="editor__syntax-codefence-lang">
        {codeFence[3]}
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

  const checkbox = /^(\s*)([-+*]|\d+[.)])(\s+)\[([ xX])\](\s+)(.*)$/.exec(line)
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

  const list = /^(\s*)([-+*]|\d+[.)])(\s+)(.*)$/.exec(line)
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
  onSystemUndo,
  onSystemRedo,
  onScrollPositionChange,
  selectionRange,
  externalSelectionRange,
  externalScrollTop,
  focusRequestId = 0,
  showSelectionOverlay,
  spellCheckEnabled = true,
  textZoomPercent = 100,
  streamingRange,
  streamingColorEnabled = true,
}) {
  const textareaRef = useRef(null)
  const isComposingRef = useRef(false)
  const pendingDashRestoreFrameRef = useRef(0)
  const lastKnownSelectionRef = useRef({
    selectionStart: 0,
    selectionEnd: 0,
    valueLength: 0,
  })
  const lastAppliedExternalSelectionFocusRequestIdRef = useRef(0)
  const [contentHeight, setContentHeight] = useState(0)
  const text = value ?? ''
  const lineCount = useMemo(() => {
    if (!text) return 1
    return text.split('\n').length
  }, [text])
  const useLightweightOverlays =
    text.length > OVERLAY_HEAVY_TEXT_LIMIT || lineCount > OVERLAY_HEAVY_LINE_LIMIT
  const isWindows = isWindowsPlatform()
  const useSyntaxTextOverlay = !useLightweightOverlays && !isWindowsPlatform()
  const effectiveScrollTop = Number.isFinite(Number(externalScrollTop))
    ? Math.max(0, Number(externalScrollTop))
    : 0

  const inlinePromptOverlay = useMemo(() => {
    if (useLightweightOverlays || isWindows) return null
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
  }, [isWindows, text, useLightweightOverlays])

  const selectionOverlay = useMemo(() => {
    if (!showSelectionOverlay || useLightweightOverlays || isWindows) return null
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
  }, [isWindows, selectionRange?.end, selectionRange?.start, showSelectionOverlay, text, useLightweightOverlays])

  const streamingOverlay = useMemo(() => {
    if (isWindows) return null
    if (useLightweightOverlays) return null
    if (!streamingColorEnabled) return null
    if (!streamingRange?.isActive && !streamingRange?.isFading) return null

    const start = Math.max(0, Math.min(Number(streamingRange.start) || 0, text.length))
    const end = Math.max(start, Math.min(Number(streamingRange.end) || start, text.length))
    if (start === end) return null

    return {
      before: text.slice(0, start),
      stream: text.slice(start, end),
      after: text.slice(end),
    }
  }, [
    isWindows,
    streamingColorEnabled,
    streamingRange?.end,
    streamingRange?.isFading,
    streamingRange?.isActive,
    streamingRange?.start,
    text,
    useLightweightOverlays,
  ])

  const syntaxOverlay = useMemo(() => {
    if (!useSyntaxTextOverlay) return null
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
  }, [text, useSyntaxTextOverlay])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    setContentHeight(textarea.scrollHeight)
    onScrollPositionChange?.({
      scrollTop: textarea.scrollTop,
      scrollHeight: textarea.scrollHeight,
      clientHeight: textarea.clientHeight,
    })
  }, [onScrollPositionChange, value])

  useEffect(() => {
    if (!Number.isFinite(Number(externalScrollTop))) return
    const textarea = textareaRef.current
    if (!textarea) return

    const nextScrollTop = Math.max(0, Number(externalScrollTop))
    if (Math.abs((textarea.scrollTop ?? 0) - nextScrollTop) < 1) return

    textarea.scrollTop = nextScrollTop
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
    if (isComposingRef.current) return

    const isTextareaFocused = document.activeElement === textarea
    const shouldForceSelectionWhileFocused =
      focusRequestId > 0 && focusRequestId !== lastAppliedExternalSelectionFocusRequestIdRef.current

    if (isTextareaFocused && !shouldForceSelectionWhileFocused) return

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

    if (shouldForceSelectionWhileFocused) {
      lastAppliedExternalSelectionFocusRequestIdRef.current = focusRequestId
    }
  }, [externalSelectionRange, focusRequestId, value])

  useEffect(() => {
    if (!focusRequestId) return
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.focus()
  }, [focusRequestId])

  const handleTextareaFocus = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      lastKnownSelectionRef.current = {
        selectionStart: textarea.selectionStart ?? 0,
        selectionEnd: textarea.selectionEnd ?? textarea.selectionStart ?? 0,
        valueLength: (value ?? '').length,
      }
    }
    recordEditorDiagnostic('editor.focus', buildEditorDiagnosticSnapshot(textarea, value ?? ''))
    if (!isMacDesktopRuntime()) return
    void prepareMacosEditorInput()
  }, [value])

  const handleTextareaBeforeInput = useCallback(
    (event) => {
      const target = event.target
      recordEditorDiagnostic('editor.beforeinput', {
        inputType: event.nativeEvent?.inputType ?? event.inputType ?? '',
        data: event.nativeEvent?.data ?? event.data ?? '',
        ...buildEditorDiagnosticSnapshot(target, value ?? ''),
      })
    },
    [value],
  )

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

      const markerStart = start - marker.length
      const markerEnd = end + marker.length
      const hasSurroundingMarker =
        markerStart >= 0 &&
        markerEnd <= text.length &&
        text.slice(markerStart, start) === marker &&
        text.slice(end, markerEnd) === marker

      if (!hasSelection && hasSurroundingMarker) {
        const nextValue = `${text.slice(0, markerStart)}${text.slice(markerEnd)}`
        const nextPosition = markerStart
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

      if (hasSelection && hasSurroundingMarker) {
        const nextValue = `${text.slice(0, markerStart)}${selected}${text.slice(markerEnd)}`
        const nextSelectionStart = markerStart
        const nextSelectionEnd = markerStart + selected.length
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
      lastKnownSelectionRef.current = {
        selectionStart: textarea.selectionStart ?? 0,
        selectionEnd: textarea.selectionEnd ?? textarea.selectionStart ?? 0,
        valueLength: textarea.value.length,
      }
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
      // Cmd/Ctrl + Backspace or Delete: delete leading indentation to line start
      // This makes indentation (spaces) act like a dedicated indentation block that
      // can be cleared quickly when the user wants to unindent to the start of the line.
      const isMod = isModShortcut(event)
      const modDeleteOrBackspace = isMod && (event.key === 'Backspace' || event.key === 'Delete')
      if (modDeleteOrBackspace) {
        const lineStart = text.lastIndexOf('\n', Math.max(start - 1, 0)) + 1
        const lineEndBoundary = text.indexOf('\n', start)
        const lineEnd = lineEndBoundary === -1 ? text.length : lineEndBoundary
        const lineText = text.slice(lineStart, lineEnd)
        const leadingWhitespace = lineText.match(/^\s+/)
        const indentLen = leadingWhitespace?.[0]?.length ?? 0
        const isListItem = LIST_ITEM_PATTERN.test(lineText)
        if (indentLen > 0 && !isListItem) {
          event.preventDefault()
          const newLineText = lineText.slice(indentLen)
          const nextValue = `${text.slice(0, lineStart)}${newLineText}${text.slice(lineEnd)}`
          onChange?.(nextValue)
          const nextPosition = lineStart
          requestAnimationFrame(() => {
            textarea.focus()
            textarea.setSelectionRange(nextPosition, nextPosition)
            onSelectionChange?.({ selectionStart: nextPosition, selectionEnd: nextPosition })
          })
          return
        }
      }
      const lineStart = text.lastIndexOf('\n', Math.max(start - 1, 0)) + 1
      const lineEndBoundary = text.indexOf('\n', start)
      const lineEnd = lineEndBoundary === -1 ? text.length : lineEndBoundary
      const lineText = text.slice(lineStart, lineEnd)
      const listMatch = lineText.match(LIST_ITEM_PATTERN)

      if (event.key === 'Enter' && !hasRangeSelection && listMatch) {
        event.preventDefault()
        const [, indentation, marker, markerSpacing = ' ', checkboxPrefix = '', itemText] = listMatch
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
        const inserted = `\n${indentation}${nextMarker}${markerSpacing}${checkboxPrefix}`
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
        const [, indentation, marker = '-', markerSpacing = ' ', checkboxPrefix = '', itemText] = listMatch
        const markerOffset = lineStart + indentation.length
        const markerTailOffset = markerOffset + marker.length + markerSpacing.length + checkboxPrefix.length
        const isEmptyListItem = itemText.trim().length === 0
        if (isMod) {
          event.preventDefault()
          const nextValue = `${text.slice(0, lineStart)}${text.slice(lineEnd)}`
          const nextPosition = lineStart
          onChange?.(nextValue)
          requestAnimationFrame(() => {
            textarea.focus()
            textarea.setSelectionRange(nextPosition, nextPosition)
            onSelectionChange?.({ selectionStart: nextPosition, selectionEnd: nextPosition })
          })
          return
        }

        if (
          indentation.length > 0 &&
          (start === markerOffset ||
            start === lineStart ||
            (isEmptyListItem && start >= markerOffset && start <= markerTailOffset))
        ) {
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

        if (!event.shiftKey && !hasMultiLineSelection && !hasRangeSelection && listMatch) {
          const [, indentation, marker = '-', markerSpacing = ' ', checkboxPrefix = '', itemText] = listMatch
          const nestedMarker = marker.endsWith('.') ? '-' : marker
          const nextLine = `${indentation}${INDENT_UNIT}${nestedMarker}${markerSpacing}${checkboxPrefix}${itemText}`
          const nextValue = `${text.slice(0, lineStart)}${nextLine}${text.slice(lineEnd)}`
          const caretShift = nextLine.length - lineText.length
          const nextPosition = Math.max(lineStart, Math.min(text.length + caretShift, start + caretShift))
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

      const isMod2 = isModShortcut(event)
      const key = event.key.toLowerCase()
      const isSystemEditShortcut = isMod2 && !event.altKey && ['c', 'v', 'x', 'z'].includes(key)

      if (isMod2 && !event.altKey && !event.shiftKey && key === 'z') {
        if (onSystemUndo?.()) {
          event.preventDefault()
          return
        }
      }

      const isRedoShortcut =
        isMod2 &&
        !event.altKey &&
        ((isMacPlatform() && event.shiftKey && key === 'z') || (!isMacPlatform() && key === 'y'))

      if (isRedoShortcut) {
        if (onSystemRedo?.()) {
          event.preventDefault()
          return
        }
      }

      if (isSystemEditShortcut) {
        return
      }

      if (isMod2 && event.shiftKey && key === 'k') {
        event.preventDefault()
        const selection = getSelectionRange()
        onPromptOpen?.(selection)
      }

      if (isMod2 && !event.shiftKey && key === 'b') {
        event.preventDefault()
        applyInlineFormat('**')
      }

      if (isMod2 && !event.shiftKey && key === 'i') {
        event.preventDefault()
        applyInlineFormat('*')
        return
      }

      const isAsteriskShortcut =
        isMod2 &&
        !event.altKey &&
        (event.key === '*' ||
          event.code === 'NumpadMultiply' ||
          (event.shiftKey && (event.code === 'Digit8' || key === '8')))
      if (isAsteriskShortcut) {
        event.preventDefault()
        applyInlineFormat('*')
        return
      }

      const isBackquoteKey = event.code === 'Backquote' || key === '`' || key === '~'
      if (isMod2 && !event.altKey && isBackquoteKey) {
        event.preventDefault()
        applyInlineFormat('~~')
        return
      }

      if (isMod2 && event.shiftKey && key === 'x') {
        event.preventDefault()
        applyInlineFormat('~~')
        return
      }

      if (isMod2 && !event.shiftKey && key === 'a') {
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
    if (!textarea) return undefined

    setContentHeight(textarea.scrollHeight)
    textarea.addEventListener('keydown', handleKeyDown)
    for (const eventName of SELECTION_EVENT_NAMES) {
      textarea.addEventListener(eventName, handleSelectionUpdate)
    }

    return () => {
      textarea.removeEventListener('keydown', handleKeyDown)
      for (const eventName of SELECTION_EVENT_NAMES) {
        textarea.removeEventListener(eventName, handleSelectionUpdate)
      }
    }
  }, [applyInlineFormat, onChange, onPromptOpen, onSelectionChange, onSystemRedo, onSystemUndo, value])

  useEffect(
    () => () => {
      if (pendingDashRestoreFrameRef.current) {
        cancelAnimationFrame(pendingDashRestoreFrameRef.current)
      }
    },
    [],
  )

  const scheduleDashSelectionRestore = useCallback(
    (target, nextPosition, expectedValue) => {
      if (pendingDashRestoreFrameRef.current) {
        cancelAnimationFrame(pendingDashRestoreFrameRef.current)
      }

      const frameId = requestAnimationFrame(() => {
        if (pendingDashRestoreFrameRef.current !== frameId) return
        pendingDashRestoreFrameRef.current = 0
        if (target.value !== expectedValue) {
          recordEditorDiagnostic('editor.dash_restore.skipped', {
            reason: 'value_mismatch',
            expectedValueLength: expectedValue.length,
            ...buildEditorDiagnosticSnapshot(target, expectedValue),
          })
          return
        }

        target.focus()
        target.setSelectionRange(nextPosition, nextPosition)
        recordEditorDiagnostic('editor.dash_restore.applied', {
          nextPosition,
          ...buildEditorDiagnosticSnapshot(target, expectedValue),
        })
        onSelectionChange?.({
          selectionStart: nextPosition,
          selectionEnd: nextPosition,
        })
      })

      pendingDashRestoreFrameRef.current = frameId
      recordEditorDiagnostic('editor.dash_restore.scheduled', {
        nextPosition,
        expectedValueLength: expectedValue.length,
        ...buildEditorDiagnosticSnapshot(target, expectedValue),
      })
    },
    [onSelectionChange],
  )

  const handleTextareaChange = (event) => {
    const target = event.target
    const inputValue = target.value
    const previousValue = value ?? ''
    const nativeInputType = event.nativeEvent?.inputType
    const nativeInputData = event.nativeEvent?.data
    const lastKnownSelection = lastKnownSelectionRef.current

    recordEditorDiagnostic('editor.change', {
      inputType: nativeInputType ?? '',
      data: nativeInputData ?? '',
      previousValueLength: previousValue.length,
      ...buildEditorDiagnosticSnapshot(target, inputValue),
    })

    if (pendingDashRestoreFrameRef.current) {
      cancelAnimationFrame(pendingDashRestoreFrameRef.current)
      pendingDashRestoreFrameRef.current = 0
      recordEditorDiagnostic('editor.dash_restore.canceled', {
        reason: 'new_input',
        ...buildEditorDiagnosticSnapshot(target, inputValue),
      })
    }

    if (inputValue.includes(EM_DASH) || inputValue.includes(EN_DASH)) {
      let didRestoreUnicodeDash = false
      const restoredUnicodeValue = Array.from(inputValue)
        .map((char, index) => {
          if (char !== EM_DASH && char !== EN_DASH) return char

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
          didRestoreUnicodeDash = true
          return '-'.repeat(runLength)
        })
        .join('')

      if (didRestoreUnicodeDash) {
        const selectionStart = target.selectionStart ?? inputValue.length
        const didConsumeTriggerSpace =
          isMacPlatform() &&
          nativeInputType === 'insertReplacementText' &&
          (nativeInputData === EM_DASH ||
            nativeInputData === EN_DASH ||
            inputValue === EM_DASH ||
            inputValue === EN_DASH) &&
          !/\s$/.test(inputValue) &&
          selectionStart >= inputValue.length
        const nextValue = didConsumeTriggerSpace ? `${restoredUnicodeValue} ` : restoredUnicodeValue
        const caretDelta = nextValue.length - inputValue.length
        const logicalSelectionStart =
          isMacPlatform() &&
          nativeInputType === 'insertReplacementText' &&
          lastKnownSelection.valueLength === previousValue.length
            ? lastKnownSelection.selectionStart
            : selectionStart
        const nextPosition = Math.max(0, Math.min(logicalSelectionStart + caretDelta, nextValue.length))

        lastKnownSelectionRef.current = {
          selectionStart: nextPosition,
          selectionEnd: nextPosition,
          valueLength: nextValue.length,
        }

        onChange(nextValue)

        scheduleDashSelectionRestore(target, nextPosition, nextValue)
        return
      }
    }

    lastKnownSelectionRef.current = {
      selectionStart: target.selectionStart ?? inputValue.length,
      selectionEnd: target.selectionEnd ?? target.selectionStart ?? inputValue.length,
      valueLength: inputValue.length,
    }
    onChange(inputValue)
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
        {syntaxOverlay && (
          <div
            className="editor__syntax-overlay"
            style={{
              transform: `translateY(${-effectiveScrollTop}px)`,
              minHeight: contentHeight || '100%',
              ...editorTextStyle,
            }}
            aria-hidden="true"
          >
            {syntaxOverlay}
          </div>
        )}
        {inlinePromptOverlay && (
          <div
            className="editor__inline-prompt-overlay"
            style={{
              transform: `translateY(${-effectiveScrollTop}px)`,
              minHeight: contentHeight || '100%',
              ...editorTextStyle,
            }}
            aria-hidden="true"
          >
            {inlinePromptOverlay}
          </div>
        )}
        {streamingOverlay && (
          <div
            className="editor__streaming-overlay"
            style={{
              transform: `translateY(${-effectiveScrollTop}px)`,
              minHeight: contentHeight || '100%',
              ...editorTextStyle,
            }}
            aria-hidden="true"
          >
            <span className="editor__streaming-overlay-text">{streamingOverlay.before}</span>
            <span
              className={`editor__streaming-overlay-token${streamingRange?.isFading ? ' editor__streaming-overlay-token--fading' : ''}`}
            >
              {streamingOverlay.stream}
            </span>
            <span className="editor__streaming-overlay-text">{streamingOverlay.after}</span>
          </div>
        )}
        {selectionOverlay && (
          <div
            className="editor__selection-overlay"
            style={{
              transform: `translateY(${-effectiveScrollTop}px)`,
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
          className={`editor__textarea${useSyntaxTextOverlay ? ' editor__textarea--syntax' : ''}`}
          value={value ?? ''}
          style={editorTextStyle}
          onChange={handleTextareaChange}
          onBeforeInput={handleTextareaBeforeInput}
          onFocus={handleTextareaFocus}
          onCompositionStart={() => {
            isComposingRef.current = true
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false
          }}
          onScroll={(event) => {
            const target = event.target
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
