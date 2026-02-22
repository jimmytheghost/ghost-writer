import { existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const metricsDir = path.join(root, 'metrics')
const distAssetsDir = path.join(root, 'dist', 'assets')
const tauriBundleDir = path.join(root, 'src-tauri', 'target', 'release', 'bundle')

function readFiles(dir, exts = []) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const fullPath = path.join(dir, entry.name)
      return { name: entry.name, sizeBytes: statSync(fullPath).size }
    })
    .filter((entry) => (exts.length ? exts.some((ext) => entry.name.endsWith(ext)) : true))
}

function readBundleArtifacts(rootDir) {
  if (!existsSync(rootDir)) return []
  const artifacts = []
  const stack = [rootDir]

  while (stack.length) {
    const current = stack.pop()
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(fullPath)
      } else if (entry.isFile()) {
        if (
          fullPath.endsWith('.exe') ||
          fullPath.endsWith('.msi') ||
          fullPath.endsWith('.dmg') ||
          fullPath.endsWith('.app.tar.gz')
        ) {
          artifacts.push({
            name: path.relative(rootDir, fullPath).replace(/\\/g, '/'),
            sizeBytes: statSync(fullPath).size,
          })
        }
      }
    }
  }

  return artifacts
}

const summary = {
  capturedAt: new Date().toISOString(),
  rendererAssets: readFiles(distAssetsDir, ['.js', '.css']),
  tauriArtifacts: readBundleArtifacts(tauriBundleDir),
}

mkdirSync(metricsDir, { recursive: true })
writeFileSync(path.join(metricsDir, 'tauri-size.json'), JSON.stringify(summary, null, 2))

console.log(JSON.stringify(summary, null, 2))
