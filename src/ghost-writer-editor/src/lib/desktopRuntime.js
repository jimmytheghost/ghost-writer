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

export async function saveMarkdownToPath(content, path) {
  if (!isDesktopRuntime()) return null

  try {
    return await invoke('save_markdown_to_path', {
      content,
      path,
    })
  } catch (error) {
    console.warn('Failed to save markdown to existing path:', error)
    return null
  }
}

export async function renameMarkdownFileWithNativeDialog(currentPath, suggestedName) {
  if (!isDesktopRuntime()) return null

  try {
    return await invoke('rename_markdown_file_with_dialog', {
      currentPath,
      suggestedName,
    })
  } catch (error) {
    console.warn('Failed to rename markdown file with native dialog:', error)
    return null
  }
}

export async function saveTextFileWithNativeDialog({
  content,
  suggestedName,
  filterName,
  extensions,
}) {
  if (!isDesktopRuntime()) return null

  try {
    return await invoke('save_text_file_with_dialog', {
      content,
      suggestedName,
      filterName,
      extensions,
    })
  } catch (error) {
    console.warn('Failed to save export file with native dialog:', error)
    return null
  }
}

export async function openMarkdownWithNativeDialog() {
  if (!isDesktopRuntime()) return null

  try {
    return await invoke('open_markdown_file')
  } catch (error) {
    console.warn('Failed to open markdown with native dialog:', error)
    return null
  }
}

export async function loadMarkdownFilesByPaths(paths = []) {
  if (!isDesktopRuntime()) return []

  try {
    return await invoke('load_markdown_files_by_paths', { paths })
  } catch (error) {
    console.warn('Failed to load markdown files by paths:', error)
    return []
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

export async function printCurrentWebview() {
  if (!isDesktopRuntime()) return false

  try {
    await invoke('print_current_webview')
    return true
  } catch (error) {
    console.warn('Failed to open native print dialog:', error)
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

/**
 * Ensures Ollama is running (checks and starts it if needed). Desktop/Tauri only.
 * @returns {{ ok: true }} on success, or {{ ok: false, error: string }} on failure.
 */
export async function ensureOllamaRunning() {
  if (!isDesktopRuntime()) return { ok: true }

  try {
    await invoke('ensure_ollama_running_command')
    return { ok: true }
  } catch (error) {
    const message = error?.message ?? String(error)
    console.warn('ensureOllamaRunning:', message)
    return { ok: false, error: message }
  }
}

/**
 * Ask the host to cancel the current Ollama stream. Desktop/Tauri only.
 */
export function ollamaCancelStream() {
  if (!isDesktopRuntime()) return
  invoke('ollama_cancel_stream').catch(() => {})
}
