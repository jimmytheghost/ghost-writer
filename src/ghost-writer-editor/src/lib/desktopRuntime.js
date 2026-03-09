import { invoke, isTauri } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { report } from './errorReporting'

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

function getErrorDetail(error) {
  if (error == null) return ''
  if (typeof error === 'string') return error.slice(0, 400)
  if (error instanceof Error) {
    return (error.stack || error.message || String(error)).slice(0, 400)
  }
  try {
    return String(error).slice(0, 400)
  } catch {
    return ''
  }
}

export function warnDesktopRuntime(event, message, error = null) {
  report(error, message)
  if (import.meta.env?.DEV) {
    // Keep developer visibility in local runs without noisy production console output.
    console.warn(`${event}:`, error ?? message)
  }

  if (!isDesktopRuntime()) return
  const detail = getErrorDetail(error)
  void invoke('log_frontend_warning', { event, message, detail }).catch(() => {})
}

export async function setAlwaysOnTop(enabled) {
  if (!isDesktopRuntime()) return false
  try {
    await invoke('set_always_on_top', { enabled })
    return true
  } catch (error) {
    warnDesktopRuntime('desktop.always_on_top.set_failed', 'Failed to set always-on-top state.', error)
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
    warnDesktopRuntime(
      'desktop.file.save_dialog.failed',
      'Failed to save markdown with native dialog.',
      error,
    )
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
    warnDesktopRuntime('desktop.file.save_path.failed', 'Failed to save markdown to existing path.', error)
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
    warnDesktopRuntime(
      'desktop.file.rename_dialog.failed',
      'Failed to rename markdown file with native dialog.',
      error,
    )
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
    warnDesktopRuntime('desktop.file.export_dialog.failed', 'Failed to save export file with native dialog.', error)
    return null
  }
}

export async function openMarkdownWithNativeDialog() {
  if (!isDesktopRuntime()) return null

  try {
    return await invoke('open_markdown_file')
  } catch (error) {
    warnDesktopRuntime('desktop.file.open_dialog.failed', 'Failed to open markdown with native dialog.', error)
    return null
  }
}

export async function loadMarkdownFilesByPaths(paths = []) {
  if (!isDesktopRuntime()) return []

  try {
    return await invoke('load_markdown_files_by_paths', { paths })
  } catch (error) {
    warnDesktopRuntime('desktop.file.load_by_paths.failed', 'Failed to load markdown files by paths.', error)
    return []
  }
}

export async function openExternalUrl(url) {
  if (!isDesktopRuntime()) return false

  try {
    await invoke('open_external_url', { url })
    return true
  } catch (error) {
    warnDesktopRuntime('desktop.url.open_external.failed', 'Failed to open external URL.', error)
    return false
  }
}

export async function printCurrentWebview() {
  if (!isDesktopRuntime()) return false

  try {
    await invoke('print_current_webview')
    return true
  } catch (error) {
    warnDesktopRuntime('desktop.print.native_dialog.failed', 'Failed to open native print dialog.', error)
    return false
  }
}

export async function loadSettings() {
  if (!isDesktopRuntime()) return null

  try {
    return await invoke('load_settings')
  } catch (error) {
    warnDesktopRuntime('desktop.settings.load.failed', 'Failed to load settings.', error)
    return null
  }
}

export async function saveSettings(settings) {
  if (!isDesktopRuntime()) return null

  try {
    return await invoke('save_settings', { settings })
  } catch (error) {
    warnDesktopRuntime('desktop.settings.save.failed', 'Failed to save settings.', error)
    return null
  }
}

export async function exitApp() {
  if (!isDesktopRuntime()) return false

  try {
    await invoke('exit_app')
    return true
  } catch (error) {
    warnDesktopRuntime('desktop.app.exit.failed', 'Failed to exit application.', error)
    return false
  }
}

export async function closeCurrentWindow() {
  if (!isDesktopRuntime()) return false

  try {
    await invoke('close_main_window')
    return true
  } catch (error) {
    warnDesktopRuntime('desktop.window.close.failed', 'Failed to close application window.', error)
    return false
  }
}

export async function listenDesktopEvent(eventName, handler) {
  if (!isDesktopRuntime()) {
    return () => {}
  }

  try {
    return await listen(eventName, handler)
  } catch (error) {
    warnDesktopRuntime(
      'desktop.event.listen.failed',
      `Failed to register desktop event listener for ${eventName}.`,
      error,
    )
    return () => {}
  }
}

export async function exportDiagnosticsBundle() {
  if (!isDesktopRuntime()) return null

  try {
    return await invoke('export_diagnostics_bundle')
  } catch (error) {
    warnDesktopRuntime(
      'desktop.diagnostics.export_bundle.failed',
      'Failed to export diagnostics bundle.',
      error,
    )
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
    warnDesktopRuntime('desktop.ollama.ensure_running.failed', 'Failed to ensure Ollama is running.', message)
    return { ok: false, error: message }
  }
}

export async function loadDesktopOllamaModels() {
  if (!isDesktopRuntime()) {
    return { ok: false, error: 'Desktop runtime unavailable.', models: [] }
  }

  try {
    const models = await invoke('load_ollama_models')
    return {
      ok: true,
      models: Array.isArray(models) ? models.filter(Boolean) : [],
    }
  } catch (error) {
    const message = error?.message ?? String(error)
    warnDesktopRuntime('desktop.ollama.load_models.failed', 'Failed to load Ollama models.', message)
    return { ok: false, error: message, models: [] }
  }
}

/**
 * Ask the host to cancel the current Ollama stream. Desktop/Tauri only.
 */
export function ollamaCancelStream() {
  if (!isDesktopRuntime()) return
  invoke('ollama_cancel_stream').catch(() => {})
}
