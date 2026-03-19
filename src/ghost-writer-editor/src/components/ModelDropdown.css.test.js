import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { describe, expect, it } from 'vitest'

const cssPath = path.join(process.cwd(), 'src', 'components', 'ModelDropdown.css')
const css = readFileSync(cssPath, 'utf8')

describe('ModelDropdown styles', () => {
  it('lays out selected rows with a fixed checkmark column so the glyph aligns with text', () => {
    expect(css).toContain('.model-dropdown__option {')
    expect(css).toContain('grid-template-columns: 1rem minmax(0, 1fr);')
    expect(css).toContain('align-items: center;')
    expect(css).toContain('.model-dropdown__check {')
    expect(css).toContain('justify-content: center;')
    expect(css).toContain('line-height: 1;')
  })

  it('renders the trigger chevron as an inline svg instead of a font glyph', () => {
    expect(css).toContain('.model-dropdown__chevron {')
    expect(css).toContain('width: 1rem;')
    expect(css).toContain('stroke: currentColor;')
    expect(css).not.toContain('material-symbols-rounded')
  })

  it('positions the popup above the footer trigger and below the settings trigger', () => {
    expect(css).toContain('.model-dropdown--placement-top .model-dropdown__menu {')
    expect(css).toContain('bottom: calc(100% + var(--space-2));')
    expect(css).toContain('.model-dropdown--placement-bottom .model-dropdown__menu {')
    expect(css).toContain('top: calc(100% + var(--space-2));')
  })
})
