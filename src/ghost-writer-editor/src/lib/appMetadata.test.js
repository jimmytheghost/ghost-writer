import packageJson from '../../package.json'
import { describe, expect, it } from 'vitest'
import { DEFAULT_APP_NAME, DEFAULT_APP_VERSION } from './appMetadata'

describe('appMetadata', () => {
  it('uses the expected default app name', () => {
    expect(DEFAULT_APP_NAME).toBe('Ghost Writer')
  })

  it('uses package.json version as the default app version', () => {
    expect(DEFAULT_APP_VERSION).toBe(packageJson.version)
  })
})
