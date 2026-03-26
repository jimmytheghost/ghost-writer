const DEFAULT_LATEST_RELEASE_URL = 'https://api.github.com/repos/jimmytheghost/ghost-writer/releases/latest'

function normalizeVersionToken(value = '') {
  return String(value).trim().replace(/^v/i, '')
}

function parseVersionParts(value = '') {
  return normalizeVersionToken(value)
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isInteger(part) && part >= 0)
}

export function isVersionNewer(currentVersion = '', latestVersion = '') {
  const currentParts = parseVersionParts(currentVersion)
  const latestParts = parseVersionParts(latestVersion)
  const maxLength = Math.max(currentParts.length, latestParts.length)

  for (let index = 0; index < maxLength; index += 1) {
    const currentPart = currentParts[index] ?? 0
    const latestPart = latestParts[index] ?? 0
    if (latestPart > currentPart) return true
    if (latestPart < currentPart) return false
  }

  return false
}

export async function checkForAppUpdate({
  currentVersion = '',
  fetchImpl = globalThis.fetch,
  latestReleaseUrl = DEFAULT_LATEST_RELEASE_URL,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    return { ok: false, updateAvailable: false, latestVersion: '', releaseUrl: '' }
  }

  try {
    const response = await fetchImpl(latestReleaseUrl, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    })

    if (!response?.ok) {
      return { ok: false, updateAvailable: false, latestVersion: '', releaseUrl: '' }
    }

    const payload = await response.json()
    const latestVersion = normalizeVersionToken(payload?.tag_name ?? '')
    if (!latestVersion) {
      return { ok: false, updateAvailable: false, latestVersion: '', releaseUrl: '' }
    }

    return {
      ok: true,
      updateAvailable: isVersionNewer(currentVersion, latestVersion),
      latestVersion,
      releaseUrl: String(payload?.html_url ?? ''),
    }
  } catch {
    return { ok: false, updateAvailable: false, latestVersion: '', releaseUrl: '' }
  }
}

