import { invoke, isTauri } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { report } from './errorReporting'

const FRONTEND_DIAGNOSTIC_TRACE_LIMIT = 120
const FRONTEND_DIAGNOSTIC_STRING_LIMIT = 240

function hasWindow() {
  return typeof window !== 'undefined'
}

function createFrontendDiagnosticsState() {
  return {
    createdAtUnixMs: Date.now(),
    runtime: {
      isDesktop: false,
      isMacDesktop: false,
      platform: typeof navigator === 'undefined' ? '' : navigator.platform ?? '',
      userAgent: typeof navigator === 'undefined' ? '' : (navigator.userAgent ?? '').slice(0, 240),
    },
    macosEditorInputPreparation: {
      attemptCount: 0,
      successCount: 0,
      failureCount: 0,
      lastAttemptUnixMs: 0,
      lastSuccessUnixMs: 0,
      lastFailureUnixMs: 0,
      lastError: '',
    },
    editorEventTrace: [],
  }
}

let frontendDiagnosticsState = createFrontendDiagnosticsState()

function truncateDiagnosticString(value) {
  const normalized = typeof value === 'string' ? value : String(value ?? '')
  if (normalized.length <= FRONTEND_DIAGNOSTIC_STRING_LIMIT) return normalized
  return `${normalized.slice(0, FRONTEND_DIAGNOSTIC_STRING_LIMIT - 1)}…`
}

function sanitizeDiagnosticValue(value, depth = 0) {
  if (value == null) return value ?? null
  if (typeof value === 'string') return truncateDiagnosticString(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) {
    if (depth >= 2) return value.length
    return value.slice(0, 12).map((entry) => sanitizeDiagnosticValue(entry, depth + 1))
  }
  if (typeof value === 'object') {
    if (depth >= 2) return '[object]'
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 24)
        .map(([key, entry]) => [key, sanitizeDiagnosticValue(entry, depth + 1)]),
    )
  }
  return truncateDiagnosticString(value)
}

function pushEditorDiagnostic(event, payload = {}) {
  const entry = {
    ts: Date.now(),
    event,
    ...sanitizeDiagnosticValue(payload),
  }
  frontendDiagnosticsState.editorEventTrace.push(entry)
  if (frontendDiagnosticsState.editorEventTrace.length > FRONTEND_DIAGNOSTIC_TRACE_LIMIT) {
    frontendDiagnosticsState.editorEventTrace.splice(
      0,
      frontendDiagnosticsState.editorEventTrace.length - FRONTEND_DIAGNOSTIC_TRACE_LIMIT,
    )
  }
}

function syncFrontendDiagnosticsRuntimeFlags() {
  frontendDiagnosticsState.runtime = {
    ...frontendDiagnosticsState.runtime,
    isDesktop: isDesktopRuntime(),
    isMacDesktop: isMacDesktopRuntime(),
    platform: typeof navigator === 'undefined' ? '' : navigator.platform ?? '',
    userAgent: typeof navigator === 'undefined' ? '' : (navigator.userAgent ?? '').slice(0, 240),
  }
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

export function recordEditorDiagnostic(event, payload = {}) {
  if (!event) return
  syncFrontendDiagnosticsRuntimeFlags()
  pushEditorDiagnostic(event, payload)
}

export function getFrontendDiagnosticsSnapshot() {
  syncFrontendDiagnosticsRuntimeFlags()
  return JSON.parse(JSON.stringify(frontendDiagnosticsState))
}

export function resetFrontendDiagnosticsForTests() {
  frontendDiagnosticsState = createFrontendDiagnosticsState()
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

export async function exportPdfCurrentWebview(suggestedName) {
  if (!isDesktopRuntime()) return false

  try {
    return await invoke('export_pdf_current_webview', { suggestedName })
  } catch (error) {
    warnDesktopRuntime('desktop.print.export_pdf.failed', 'Failed to export PDF.', error)
    return null
  }
}

export async function prepareMacosEditorInput() {
  if (!isMacDesktopRuntime()) return false

  syncFrontendDiagnosticsRuntimeFlags()
  frontendDiagnosticsState.macosEditorInputPreparation.attemptCount += 1
  frontendDiagnosticsState.macosEditorInputPreparation.lastAttemptUnixMs = Date.now()
  frontendDiagnosticsState.macosEditorInputPreparation.lastError = ''
  pushEditorDiagnostic('desktop.editor.macos_input.prepare.start')

  try {
    await invoke('prepare_macos_editor_input')
    frontendDiagnosticsState.macosEditorInputPreparation.successCount += 1
    frontendDiagnosticsState.macosEditorInputPreparation.lastSuccessUnixMs = Date.now()
    pushEditorDiagnostic('desktop.editor.macos_input.prepare.success')
    return true
  } catch (error) {
    frontendDiagnosticsState.macosEditorInputPreparation.failureCount += 1
    frontendDiagnosticsState.macosEditorInputPreparation.lastFailureUnixMs = Date.now()
    frontendDiagnosticsState.macosEditorInputPreparation.lastError = getErrorDetail(error)
    pushEditorDiagnostic('desktop.editor.macos_input.prepare.failure', {
      detail: frontendDiagnosticsState.macosEditorInputPreparation.lastError,
    })
    warnDesktopRuntime(
      'desktop.editor.macos_input.prepare_failed',
      'Failed to prepare macOS editor input behavior.',
      error,
    )
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
    return await invoke('export_diagnostics_bundle', {
      frontendDiagnostics: getFrontendDiagnosticsSnapshot(),
    })
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
