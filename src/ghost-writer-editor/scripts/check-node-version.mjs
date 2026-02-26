function parseVersion(raw) {
  const normalized = String(raw ?? '').replace(/^v/i, '')
  const [majorRaw = '0', minorRaw = '0', patchRaw = '0'] = normalized.split('.')
  const major = Number.parseInt(majorRaw, 10)
  const minor = Number.parseInt(minorRaw, 10)
  const patch = Number.parseInt(patchRaw, 10)

  if (![major, minor, patch].every(Number.isFinite)) {
    return { major: 0, minor: 0, patch: 0 }
  }

  return { major, minor, patch }
}

function isSupportedNode(version) {
  if (version.major < 20) return false
  if (version.major === 20) {
    if (version.minor < 19) return false
    if (version.minor === 19) return version.patch >= 0
    return true
  }
  if (version.major === 21) return false
  if (version.major === 22) {
    if (version.minor < 12) return false
    if (version.minor === 12) return version.patch >= 0
    return true
  }
  return true
}

const active = parseVersion(process.version)
if (isSupportedNode(active)) {
  process.exit(0)
}

const current = `${active.major}.${active.minor}.${active.patch}`

console.error(`[node-version-check] Unsupported Node.js runtime for this project.`)
console.error(`[node-version-check] Required: >=20.19.0 (Node 20) or >=22.12.0`)
console.error(`[node-version-check] Current: v${current}`)
console.error(`[node-version-check] Executable: ${process.execPath}`)
console.error(`[node-version-check] Hint: if you use nvm, run "nvm use" from the repo root.`)
process.exit(1)
