import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const invokeMock = vi.hoisted(() => vi.fn())
const isTauriMock = vi.hoisted(() => vi.fn(() => true))
const listenMock = vi.hoisted(() => vi.fn())

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
  isTauri: isTauriMock,
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: listenMock,
}))

vi.mock('./errorReporting', () => ({
  report: vi.fn(),
}))

import {
  exportDiagnosticsBundle,
  getFrontendDiagnosticsSnapshot,
  prepareMacosEditorInput,
  recordEditorDiagnostic,
  resetFrontendDiagnosticsForTests,
} from './desktopRuntime'

function mockNavigatorPlatform(platform) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'platform')
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    get: () => platform,
  })
  return () => {
    if (originalDescriptor) {
      Object.defineProperty(window.navigator, 'platform', originalDescriptor)
      return
    }
    delete window.navigator.platform
  }
}

describe('desktopRuntime diagnostics', () => {
  let consoleWarnSpy

  beforeEach(() => {
    resetFrontendDiagnosticsForTests()
    invokeMock.mockReset()
    isTauriMock.mockReset()
    isTauriMock.mockReturnValue(true)
    listenMock.mockReset()
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleWarnSpy?.mockRestore()
    vi.restoreAllMocks()
  })

  it('passes frontend editor diagnostics through the exported diagnostics bundle request', async () => {
    const restorePlatform = mockNavigatorPlatform('MacIntel')
    invokeMock.mockResolvedValue('{"ok":true}')

    try {
      recordEditorDiagnostic('editor.beforeinput', {
        inputType: 'insertReplacementText',
        data: '—',
        selectionStart: 2,
      })

      await exportDiagnosticsBundle()

      expect(invokeMock).toHaveBeenCalledWith(
        'export_diagnostics_bundle',
        expect.objectContaining({
          frontendDiagnostics: expect.objectContaining({
            editorEventTrace: expect.arrayContaining([
              expect.objectContaining({
                event: 'editor.beforeinput',
                inputType: 'insertReplacementText',
                data: '—',
                selectionStart: 2,
              }),
            ]),
            runtime: expect.objectContaining({
              isDesktop: true,
              isMacDesktop: true,
              platform: 'MacIntel',
            }),
          }),
        }),
      )
    } finally {
      restorePlatform()
    }
  })

  it('tracks successful macOS input preparation attempts in frontend diagnostics', async () => {
    const restorePlatform = mockNavigatorPlatform('MacIntel')
    invokeMock.mockResolvedValue(undefined)

    try {
      await expect(prepareMacosEditorInput()).resolves.toBe(true)

      const snapshot = getFrontendDiagnosticsSnapshot()
      expect(snapshot.macosEditorInputPreparation).toEqual(
        expect.objectContaining({
          attemptCount: 1,
          successCount: 1,
          failureCount: 0,
          lastError: '',
        }),
      )
      expect(snapshot.editorEventTrace).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ event: 'desktop.editor.macos_input.prepare.start' }),
          expect.objectContaining({ event: 'desktop.editor.macos_input.prepare.success' }),
        ]),
      )
    } finally {
      restorePlatform()
    }
  })

  it('tracks failed macOS input preparation attempts in frontend diagnostics', async () => {
    const restorePlatform = mockNavigatorPlatform('MacIntel')
    invokeMock.mockRejectedValue(new Error('native prep failed'))

    try {
      await expect(prepareMacosEditorInput()).resolves.toBe(false)

      const snapshot = getFrontendDiagnosticsSnapshot()
      expect(snapshot.macosEditorInputPreparation).toEqual(
        expect.objectContaining({
          attemptCount: 1,
          successCount: 0,
          failureCount: 1,
          lastError: expect.stringContaining('native prep failed'),
        }),
      )
      expect(snapshot.editorEventTrace).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ event: 'desktop.editor.macos_input.prepare.start' }),
          expect.objectContaining({
            event: 'desktop.editor.macos_input.prepare.failure',
            detail: expect.stringContaining('native prep failed'),
          }),
        ]),
      )
    } finally {
      restorePlatform()
    }
  })
})
