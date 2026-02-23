import { invoke, isTauri } from '@tauri-apps/api/core'

function hasWindow() {
  return typeof window !== 'undefined'
}

export function isTauriRuntime() {
  if (!hasWindow()) return false
  return isTauri()
}

export function isDesktopRuntime() {
  return isTauriRuntime()
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

export async function setAlwaysOnTop(enabled) {
  if (!isDesktopRuntime()) return false
  try {
    await invoke('set_always_on_top', { enabled })
    return true
  } catch (error) {
    console.warn('Failed to set always-on-top state:', error)
    return false
  }
}
