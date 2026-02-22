import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, appendFileSync } from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = !app.isPackaged
const startupEpochMs = Date.now()

let mainWindow = null

function getPerfLogPath() {
  const dir = path.join(app.getPath('userData'), 'telemetry')
  mkdirSync(dir, { recursive: true })
  return path.join(dir, 'startup-metrics.jsonl')
}

function logPerf(event, payload = {}) {
  const entry = {
    ts: new Date().toISOString(),
    event,
    elapsedMs: Date.now() - startupEpochMs,
    ...payload,
  }

  try {
    appendFileSync(getPerfLogPath(), `${JSON.stringify(entry)}\n`)
  } catch {
    // Ignore telemetry write errors; never block app startup.
  }
}

function createWindow() {
  logPerf('browser-window-create-start')
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#121212',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDev,
      backgroundThrottling: true,
    },
  })

  logPerf('browser-window-created')

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    logPerf('window-ready-to-show')
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }
}

ipcMain.on('app-perf:renderer-interactive', (_event, payload) => {
  logPerf('renderer-first-interactive', payload)
})

app.whenReady().then(() => {
  logPerf('app-ready')
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
