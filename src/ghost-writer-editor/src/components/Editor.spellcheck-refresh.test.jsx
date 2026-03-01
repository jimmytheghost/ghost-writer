import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Editor from './Editor'

let isCustomWordEnabled = false

vi.mock('../lib/spellcheck', () => ({
  isSpellcheckReady: () => true,
  preloadSpellcheck: vi.fn(async () => true),
  getMisspelledRanges: vi.fn((text) => {
    if (!text.includes('ghostwriter')) return []
    if (isCustomWordEnabled) return []
    return [{ start: 0, end: 'ghostwriter'.length }]
  }),
}))

describe('Editor spellcheck refresh', () => {
  it('recomputes misspellings when spellcheckRefreshKey changes', () => {
    isCustomWordEnabled = false

    const baseProps = {
      value: 'ghostwriter ',
      onChange: vi.fn(),
      onPromptOpen: vi.fn(),
      onSelectionChange: vi.fn(),
      selectionRange: { start: 0, end: 0 },
      showSelectionOverlay: false,
      spellCheckEnabled: true,
      textZoomPercent: 100,
    }

    const { container, rerender } = render(
      <Editor
        {...baseProps}
        spellcheckRefreshKey={0}
      />,
    )

    expect(container.querySelector('.editor__spell-overlay-error')).not.toBeNull()

    isCustomWordEnabled = true
    rerender(
      <Editor
        {...baseProps}
        spellcheckRefreshKey={1}
      />,
    )

    expect(container.querySelector('.editor__spell-overlay-error')).toBeNull()
  })
})
