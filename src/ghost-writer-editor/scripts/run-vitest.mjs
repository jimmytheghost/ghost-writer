import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const vitestEntrypoint = path.join(projectRoot, 'node_modules', 'vitest', 'vitest.mjs')
const argv = process.argv.slice(2)

const rawNodeOptions = process.env.NODE_OPTIONS ?? ''
const sanitizedNodeOptions = rawNodeOptions
  .split(/\s+/)
  .filter(Boolean)
  .filter((token) => !token.startsWith('--localstorage-file'))
  .join(' ')

const child = spawn(process.execPath, [vitestEntrypoint, ...argv], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: sanitizedNodeOptions,
  },
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})

