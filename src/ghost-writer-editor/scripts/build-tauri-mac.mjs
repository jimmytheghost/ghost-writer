import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const ARCH_TO_TARGET = {
  arm64: 'aarch64-apple-darwin',
  x64: 'x86_64-apple-darwin',
}

function parseNodeVersion(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version?.trim() ?? '')
  if (!match) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  }
}

function isSupportedNodeVersion(version) {
  const parsed = parseNodeVersion(version)
  if (!parsed) return false
  if (parsed.major > 22) return true
  if (parsed.major === 22) return parsed.minor >= 12
  if (parsed.major === 20) return parsed.minor >= 19
  return false
}

function readNodeVersion(nodeBinaryPath) {
  try {
    return execFileSync(nodeBinaryPath, ['-p', 'process.versions.node'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

function resolvePreferredNodeBinDir() {
  const candidateDirs = [
    path.dirname(process.execPath),
    '/opt/homebrew/bin',
    '/usr/local/bin',
  ].filter(Boolean)

  for (const dir of candidateDirs) {
    const nodeBinaryPath = path.join(dir, 'node')
    if (!existsSync(nodeBinaryPath)) continue

    const version = readNodeVersion(nodeBinaryPath)
    if (!version || !isSupportedNodeVersion(version)) continue

    return {
      dir,
      version,
    }
  }

  return null
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
const preferredNode = resolvePreferredNodeBinDir()
const env = { ...process.env, CI: 'false' }
if (preferredNode) {
  env.PATH = `${preferredNode.dir}:${process.env.PATH ?? ''}`
  console.log(
    `[build-tauri-mac] Using Node ${preferredNode.version} from ${preferredNode.dir} for Tauri build subprocesses.`,
  )
}

const result = spawnSync('npx', args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env,
})
process.exit(result.status ?? 1)
