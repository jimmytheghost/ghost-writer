import { existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const releaseDir = path.join(root, 'release')
const distAssetsDir = path.join(root, 'dist', 'assets')
const metricsDir = path.join(root, 'metrics')

function readDirSizes(dir, exts = []) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .map((name) => {
      const fullPath = path.join(dir, name)
      const stats = statSync(fullPath)
      return { name, fullPath, sizeBytes: stats.size, isFile: stats.isFile() }
    })
    .filter((entry) => entry.isFile)
    .filter((entry) => (exts.length ? exts.some((ext) => entry.name.endsWith(ext)) : true))
    .map(({ name, sizeBytes }) => ({ name, sizeBytes }))
}

const rendererAssets = readDirSizes(distAssetsDir, ['.js', '.css'])
const installers = readDirSizes(releaseDir, ['.exe', '.dmg', '.zip'])
const now = new Date().toISOString()

const summary = {
  capturedAt: now,
  rendererAssets,
  installers,
}

mkdirSync(metricsDir, { recursive: true })
writeFileSync(path.join(metricsDir, 'package-size.json'), JSON.stringify(summary, null, 2))

console.log(JSON.stringify(summary, null, 2))
