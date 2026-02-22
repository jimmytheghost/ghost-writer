import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('ghostWriterDesktop', {
  markRendererInteractive(payload = {}) {
    ipcRenderer.send('app-perf:renderer-interactive', payload)
  },
})
