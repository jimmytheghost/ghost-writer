import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { describe, expect, it } from 'vitest'

const modelDropdownCssPath = path.join(process.cwd(), 'src', 'components', 'ModelDropdown.css')
const modelDropdownCss = readFileSync(modelDropdownCssPath, 'utf8')

describe('ModelDropdown hover-only contrast border', () => {
  it('shows contrasting border only on hover/focus/open with 1s fade and theme-aware color', () => {
    expect(modelDropdownCss).toContain('.model-dropdown__button::after {')
    expect(modelDropdownCss).toContain('opacity: 0;')
    expect(modelDropdownCss).toContain('transition: opacity 1s ease;')
    expect(modelDropdownCss).toContain('.model-dropdown__button:hover::after,')
    expect(modelDropdownCss).toContain('.model-dropdown__button:focus-visible::after,')
    expect(modelDropdownCss).toContain('.model-dropdown--open .model-dropdown__button::after {')
    expect(modelDropdownCss).toContain('opacity: 1;')
    expect(modelDropdownCss).toContain('.app--dark .model-dropdown__button::after {')
  })

  it('uses footer-matching resting border in dark mode', () => {
    expect(modelDropdownCss).toContain('.app--dark .model-dropdown__button {')
    expect(modelDropdownCss).toContain('border-color: var(--color-gray-800);')
  })

  it('uses footer-matching resting border in light mode', () => {
    expect(modelDropdownCss).toContain('.model-dropdown__button {')
    expect(modelDropdownCss).toContain('border: 1px solid var(--color-gray-100);')
  })
})
