const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')
const fs = require('fs')

// Keep a global reference to prevent garbage collection
let mainWindow = null

function resolveLogoPath() {
  const candidates = [
    path.join(__dirname, '..', 'build', 'wraider-logo.png'),
    path.join(process.resourcesPath, 'build', 'wraider-logo.png'),
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
  const isDev = !app.isPackaged
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
    minWidth: 800,
    minHeight: 600,
    maxWidth: 800,
    maxHeight: 900,
    title: 'Wraider',
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

  // Create application menu
  const menuTemplate = [
    ...(process.platform === 'darwin' ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Document',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new')
          }
        },
        {
          label: 'Save Document',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu-save')
          }
        },
        {
          label: 'Open Document',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu-open')
          }
        },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    }
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
