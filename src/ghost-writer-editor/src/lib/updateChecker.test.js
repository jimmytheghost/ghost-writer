import { describe, expect, it, vi } from 'vitest'
import { checkForAppUpdate, isVersionNewer } from './updateChecker'

describe('updateChecker', () => {
  it('detects newer versions', () => {
    expect(isVersionNewer('1.5.1', '1.5.2')).toBe(true)
    expect(isVersionNewer('1.5.1', '1.5.1')).toBe(false)
    expect(isVersionNewer('1.5.2', '1.5.1')).toBe(false)
    expect(isVersionNewer('v1.5.1', 'v1.6.0')).toBe(true)
  })

  it('returns update available when latest tag is newer', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tag_name: 'v1.5.2',
        html_url: 'https://github.com/jimmytheghost/ghost-writer/releases/tag/v1.5.2',
      }),
    })

    const result = await checkForAppUpdate({ currentVersion: '1.5.1', fetchImpl })
    expect(result.ok).toBe(true)
    expect(result.updateAvailable).toBe(true)
    expect(result.latestVersion).toBe('1.5.2')
    expect(result.releaseUrl).toContain('/releases/tag/v1.5.2')
  })

  it('returns safe failure when request fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'))
    const result = await checkForAppUpdate({ currentVersion: '1.5.1', fetchImpl })
    expect(result.ok).toBe(false)
    expect(result.updateAvailable).toBe(false)
  })
})
