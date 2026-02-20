const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')
const fs = require('fs')

const APP_DISPLAY_NAME = 'Ghost Writer'

// Ensure the runtime app name is correct in macOS dock/menu while developing.
app.setName(APP_DISPLAY_NAME)

// Keep a global reference to prevent garbage collection
let mainWindow = null

function resolveLogoPath() {
  const candidates = [
    path.join(__dirname, '..', 'build', 'ghost-writer-logo.png'),
    path.join(process.resourcesPath, 'build', 'ghost-writer-logo.png'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

function createWindow() {
  // Get the path to the built Vite app
  const distPath = path.join(__dirname, '..', 'dist')
  const indexPath = path.join(distPath, 'index.html')
  const logoPath = resolveLogoPath()

  // Log for debugging
  console.log('App path:', app.getAppPath())
  console.log('Dist path:', distPath)
  console.log('Index path:', indexPath)
  console.log('Is packaged:', app.isPackaged)
  console.log('Logo path:', logoPath ?? 'not found')

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 900,
    minWidth: 500,
    minHeight: 500,
    maxWidth: 800,
    maxHeight: 900,
    title: 'Ghost Writer',
    backgroundColor: '#f9fafb',
    ...(logoPath ? { icon: logoPath } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Enable web security but allow local requests
      webSecurity: true,
      // Allow loading local files
      allowRunningInsecureContent: false,
    },
    // Remove default menu on macOS for cleaner look
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    // Show window immediately when ready
    show: false,
  })

  // Use standard Electron menus and shortcuts only.
  const menuTemplate = [
    ...(process.platform === 'darwin'
      ? [
          {
            label: APP_DISPLAY_NAME,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ]

  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)

  // Load the app
  if (fs.existsSync(indexPath)) {
    mainWindow.loadFile(indexPath)
  } else {
    // Fallback for development - load from localhost
    mainWindow.loadURL('http://localhost:5173')
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    console.log('Window shown')
  })

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Log any load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
  })

  mainWindow.webContents.on('crashed', () => {
    console.error('Renderer process crashed')
  })
}

// App lifecycle
app.whenReady().then(() => {
  const logoPath = resolveLogoPath()

  if (process.platform === 'darwin' && logoPath) {
    app.dock.setIcon(logoPath)
  }

  createWindow()

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // On macOS, apps typically stay active until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})
