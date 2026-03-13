import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('tauri asset protocol config', () => {
  it('allows desktop image embeds from user-accessible local files', () => {
    const configPath = resolve(import.meta.dirname, '../src-tauri/tauri.conf.json')
    const config = JSON.parse(readFileSync(configPath, 'utf8'))
    const scope = config?.app?.security?.assetProtocol?.scope

    expect(config?.app?.security?.assetProtocol?.enable).toBe(true)
    expect(Array.isArray(scope)).toBe(true)
    expect(scope).toContain('$HOME/**')
  })
})
