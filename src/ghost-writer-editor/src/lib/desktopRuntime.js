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

export async function saveMarkdownWithNativeDialog(content, suggestedName) {
  if (!isDesktopRuntime()) return null

  try {
    return await invoke('save_markdown_file', {
      content,
      suggestedName,
    })
  } catch (error) {
    console.warn('Failed to save markdown with native dialog:', error)
    return null
  }
}

export async function openExternalUrl(url) {
  if (!isDesktopRuntime()) return false

  try {
    await invoke('open_external_url', { url })
    return true
  } catch (error) {
    console.warn('Failed to open external URL:', error)
    return false
  }
}

export async function loadSettings() {
  if (!isDesktopRuntime()) return null

  try {
    return await invoke('load_settings')
  } catch (error) {
    console.warn('Failed to load settings:', error)
    return null
  }
}

export async function saveSettings(settings) {
  if (!isDesktopRuntime()) return null

  try {
    return await invoke('save_settings', { settings })
  } catch (error) {
    console.warn('Failed to save settings:', error)
    return null
  }
}
