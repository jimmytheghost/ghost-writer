import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { describe, expect, it } from 'vitest'

const appCssPath = path.join(process.cwd(), 'src', 'App.css')
const appCss = readFileSync(appCssPath, 'utf8')

describe('App preview table styles', () => {
  it('defines markdown table styles with preview design tokens', () => {
    expect(appCss).toContain('.preview__content table')
    expect(appCss).toContain('.preview__content thead th')
    expect(appCss).toContain('.preview__content tbody tr:nth-child(even)')
    expect(appCss).toContain('.preview__content th,')
    expect(appCss).toContain('.preview__content td')
    expect(appCss).toContain('border-collapse: collapse;')
    expect(appCss).toContain('font-size: var(--font-size-sm);')
    expect(appCss).toContain('border: 1px solid color-mix(in srgb, var(--color-gray-300)')
    expect(appCss).toContain('background: color-mix(in srgb, var(--color-gray-100)')
  })

  it('adds bottom spacing to the selected-text prompt panel card', () => {
    expect(appCss).toContain('.prompt-panel__selection {')
    expect(appCss).toContain('padding: var(--space-3) var(--space-3) var(--space-4);')
    expect(appCss).toContain('margin-bottom: var(--space-1);')
  })

  it('animates contrasting prompt input hover border with a 1s fade for light and dark themes', () => {
    expect(appCss).toContain('.prompt-panel--hover-border-enabled .prompt-panel__form::after {')
    expect(appCss).toContain('opacity: 0;')
    expect(appCss).toContain('transition: opacity 1s ease;')
    expect(appCss).toContain('.prompt-panel--hover-border-enabled .prompt-panel__form:hover::after,')
    expect(appCss).toContain('.prompt-panel--hover-border-enabled .prompt-panel__form:focus-within::after {')
    expect(appCss).toContain('opacity: 1;')
    expect(appCss).toContain('.app--dark .prompt-panel--hover-border-enabled .prompt-panel__form::after {')
  })

  it('renders tab close buttons as circular overlays above truncated labels', () => {
    expect(appCss).toContain('.tab-bar__close {')
    expect(appCss).toContain('border-radius: var(--radius-full);')
    expect(appCss).toContain('z-index: 1;')
    expect(appCss).toContain('.tab-bar__tab:hover .tab-bar__close,')
    expect(appCss).toContain('background: color-mix(in srgb, var(--color-gray-300) 20%, #383737);')
    expect(appCss).toContain('.app--dark .tab-bar__tab:hover .tab-bar__close,')
    expect(appCss).toContain('background: color-mix(in srgb, var(--color-gray-600) 38%, #383737);')
  })

  it('hides the model dropdown chevron when the footer model control is icon-only', () => {
    expect(appCss).toContain('@media (max-width: 525px) {')
    expect(appCss).toContain('.footer-model .model-dropdown__chevron {')
    expect(appCss).toContain('display: none;')
  })
})
