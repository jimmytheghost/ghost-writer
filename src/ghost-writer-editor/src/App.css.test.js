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

  it('renders tab close buttons as circular overlays above truncated labels', () => {
    expect(appCss).toContain('.tab-bar__close {')
    expect(appCss).toContain('border-radius: var(--radius-full);')
    expect(appCss).toContain('z-index: 1;')
    expect(appCss).toContain('.tab-bar__tab:hover .tab-bar__close,')
    expect(appCss).toContain('background: color-mix(in srgb, var(--color-gray-300) 20%, #383737);')
    expect(appCss).toContain('.app--dark .tab-bar__tab:hover .tab-bar__close,')
    expect(appCss).toContain('background: color-mix(in srgb, var(--color-gray-600) 38%, #383737);')
  })
})
