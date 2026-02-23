import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

function parseModels(stdout) {
  const models = []

  for (const rawLine of stdout.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('NAME')) continue

    const [name] = line.split(/\s+/)
    if (!name) continue
    if (!models.includes(name)) {
      models.push(name)
    }
  }

  return models.sort((a, b) => a.localeCompare(b))
}

function readModelsFromOllama() {
  const output = execFileSync('ollama', ['list'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return parseModels(output)
}

const root = process.cwd()
const publicDir = path.join(root, 'public')
const generatedDir = path.join(root, 'src', 'generated')
const publicOutputPath = path.join(publicDir, 'ollama-models.json')
const generatedOutputPath = path.join(generatedDir, 'ollama-models.json')

let models = []
let error = null

try {
  models = readModelsFromOllama()
} catch (err) {
  error = err?.message ?? 'Failed to run `ollama list`.'
}

mkdirSync(publicDir, { recursive: true })
mkdirSync(generatedDir, { recursive: true })
const payload = `${JSON.stringify(
  {
    models,
    source: 'ollama list',
    error,
  },
  null,
  2,
)}\n`
writeFileSync(publicOutputPath, payload, 'utf8')
writeFileSync(generatedOutputPath, payload, 'utf8')

if (error) {
  console.error(`[sync-ollama-models] Wrote empty model snapshots: ${error}`)
} else {
  console.log(
    `[sync-ollama-models] Wrote ${models.length} model(s) to public/ollama-models.json and src/generated/ollama-models.json`,
  )
}
