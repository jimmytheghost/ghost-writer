import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Editor from './Editor'

describe('Editor large-document optimization', () => {
  it('disables heavy overlays for very large content', () => {
    const largeText = `${'line\n'.repeat(3000)}end`
    const { container } = render(
      <Editor
        value={largeText}
        onChange={vi.fn()}
        onPromptOpen={vi.fn()}
        onSelectionChange={vi.fn()}
        selectionRange={{ start: 0, end: 4 }}
        showSelectionOverlay={true}
        spellCheckEnabled={true}
        textZoomPercent={100}
      />,
    )

    expect(container.querySelector('.editor__syntax-overlay')).toBeNull()
    expect(container.querySelector('.editor__spell-overlay')).toBeNull()
    expect(container.querySelector('.editor__inline-prompt-overlay')).toBeNull()
    expect(container.querySelector('.editor__selection-overlay')).toBeNull()
  })
})
