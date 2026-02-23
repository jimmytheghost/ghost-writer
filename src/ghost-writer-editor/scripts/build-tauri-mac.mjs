import { execFileSync, spawnSync } from 'node:child_process'

const ARCH_TO_TARGET = {
  arm64: 'aarch64-apple-darwin',
  x64: 'x86_64-apple-darwin',
}

function readInstalledRustTargets() {
  try {
    const output = execFileSync('rustup', ['target', 'list', '--installed'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function resolveMacBuildTarget(installedTargets) {
  const overrideTarget = process.env.TAURI_MAC_TARGET?.trim()
  if (overrideTarget) return overrideTarget

  const preferredTarget = ARCH_TO_TARGET[process.arch]
  if (preferredTarget && (installedTargets.length === 0 || installedTargets.includes(preferredTarget))) {
    return preferredTarget
  }

  const fallbackTarget = installedTargets.find((target) => target.endsWith('-apple-darwin'))
  if (fallbackTarget) {
    console.warn(
      `[build-tauri-mac] Preferred target (${preferredTarget ?? 'unknown'}) is unavailable; using installed target ${fallbackTarget}.`,
    )
    return fallbackTarget
  }

  return preferredTarget ?? null
}

const installedTargets = readInstalledRustTargets()
const target = resolveMacBuildTarget(installedTargets)
const args = ['tauri', 'build', '--bundles', 'dmg']
if (target) {
  args.push('--target', target)
}

console.log(`[build-tauri-mac] Building DMG with target: ${target ?? 'default toolchain target'}`)
const result = spawnSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' })
process.exit(result.status ?? 1)
