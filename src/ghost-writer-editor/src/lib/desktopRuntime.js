function hasWindow() {
  return typeof window !== 'undefined'
}

export function isElectronRuntime() {
  if (!hasWindow() || typeof navigator === 'undefined') return false
  return /Electron/i.test(navigator.userAgent)
}

export function isTauriRuntime() {
  if (!hasWindow() || typeof navigator === 'undefined') return false
  return /Tauri/i.test(navigator.userAgent)
}

export function isDesktopRuntime() {
  return isElectronRuntime() || isTauriRuntime()
}

export function isMacDesktopRuntime() {
  if (!isDesktopRuntime() || typeof navigator === 'undefined') return false
  return /Mac/i.test(navigator.platform)
}

export function markRendererInteractive(payload = {}) {
  if (!hasWindow()) return
  const marker = window.ghostWriterDesktop?.markRendererInteractive
  if (typeof marker === 'function') {
    marker(payload)
  }
}
