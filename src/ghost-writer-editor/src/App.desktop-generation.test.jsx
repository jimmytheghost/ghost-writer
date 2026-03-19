import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const invokeMock = vi.hoisted(() => vi.fn())
const isTauriMock = vi.hoisted(() => vi.fn(() => true))
const listenHandlers = vi.hoisted(() => new Map())
const getNameMock = vi.hoisted(() => vi.fn(async () => 'Ghost Writer'))
const getVersionMock = vi.hoisted(() => vi.fn(async () => '1.4.20'))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
  isTauri: isTauriMock,
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: async (eventName, handler) => {
    const handlers = listenHandlers.get(eventName) ?? []
    handlers.push(handler)
    listenHandlers.set(eventName, handlers)

    return () => {
      const currentHandlers = listenHandlers.get(eventName) ?? []
      listenHandlers.set(
        eventName,
        currentHandlers.filter((entry) => entry !== handler),
      )
    }
  },
}))

vi.mock('@tauri-apps/api/app', () => ({
  getName: getNameMock,
  getVersion: getVersionMock,
}))

import App from './App'

function createDeferred() {
  let resolve
  let reject
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, resolve, reject }
}

function emitDesktopEvent(eventName, payload) {
  const handlers = listenHandlers.get(eventName) ?? []
  handlers.forEach((handler) => handler({ payload }))
}

function getEditor() {
  const editor = document.querySelector('textarea.editor__textarea')
  expect(editor).not.toBeNull()
  return editor
}

describe('App desktop generation', () => {
  const pendingStreams = new Map()

  beforeEach(() => {
    listenHandlers.clear()
    pendingStreams.clear()
    invokeMock.mockReset()
    isTauriMock.mockReset()
    isTauriMock.mockReturnValue(true)
    getNameMock.mockClear()
    getVersionMock.mockClear()
    invokeMock.mockImplementation((command, payload = {}) => {
      switch (command) {
        case 'load_ollama_models':
          return Promise.resolve(['llama3.1:8b'])
        case 'load_settings':
          return Promise.resolve(null)
        case 'save_settings':
          return Promise.resolve(null)
        case 'ensure_ollama_running_command':
          return Promise.resolve(null)
        case 'log_frontend_warning':
          return Promise.resolve(null)
        case 'ollama_cancel_stream':
          return Promise.resolve(null)
        case 'ollama_generate_stream': {
          const deferred = createDeferred()
          pendingStreams.set(Number(payload.requestId), deferred)
          return deferred.promise
        }
        default:
          return Promise.resolve(null)
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ignores stale desktop stream chunks from an older request after stop and resend', async () => {
    render(<App />)

    const promptInput = screen.getByLabelText('Prompt input')
    fireEvent.change(promptInput, { target: { value: 'Write a long story' } })

    await waitFor(() => {
      expect(screen.getByLabelText('Send prompt')).not.toBeDisabled()
    })

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Send prompt'))
    })

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        'ollama_generate_stream',
        expect.objectContaining({ requestId: 1 }),
      )
    })

    await act(async () => {
      emitDesktopEvent('ollama-stream-chunk', {
        requestId: 1,
        response: 'Once upon a time. A young',
      })
    })

    await waitFor(() => {
      expect(getEditor().value).toBe('Once upon a time. A young')
    })

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Stop generation'))
    })

    expect(invokeMock).toHaveBeenCalledWith('ollama_cancel_stream', { requestId: 1 })

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Send prompt'))
    })

    const secondGenerateCall = invokeMock.mock.calls.find(
      ([command, payload]) => command === 'ollama_generate_stream' && Number(payload?.requestId) !== 1,
    )
    expect(secondGenerateCall).toBeDefined()
    const secondRequestId = Number(secondGenerateCall?.[1]?.requestId)

    await act(async () => {
      emitDesktopEvent('ollama-stream-chunk', {
        requestId: 1,
        response: ' SHOULD_NOT_APPEAR',
      })
      emitDesktopEvent('ollama-stream-chunk', {
        requestId: secondRequestId,
        response: 'Sophia lived by the sea.',
      })
      emitDesktopEvent('ollama-stream-cancelled', { requestId: 1 })
      pendingStreams.get(1)?.resolve()
      emitDesktopEvent('ollama-stream-done', { requestId: secondRequestId })
      pendingStreams.get(secondRequestId)?.resolve()
    })

    await waitFor(() => {
      expect(getEditor().value).toBe('Once upon a time. Sophia lived by the sea.')
      expect(getEditor().value).not.toContain('SHOULD_NOT_APPEAR')
    })
  })

  it('strips overlapping desktop continuation text when a resumed request restarts the recent excerpt', async () => {
    render(<App />)

    const promptInput = screen.getByLabelText('Prompt input')
    fireEvent.change(promptInput, { target: { value: 'Write a long story' } })

    await waitFor(() => {
      expect(screen.getByLabelText('Send prompt')).not.toBeDisabled()
    })

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Send prompt'))
    })

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        'ollama_generate_stream',
        expect.objectContaining({ requestId: 1 }),
      )
    })

    await act(async () => {
      emitDesktopEvent('ollama-stream-chunk', {
        requestId: 1,
        response: 'Once upon a time. The old mansion had been',
      })
    })

    await waitFor(() => {
      expect(getEditor().value).toBe('Once upon a time. The old mansion had been')
    })

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Stop generation'))
    })

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Send prompt'))
    })

    const secondGenerateCall = invokeMock.mock.calls.find(
      ([command, payload]) => command === 'ollama_generate_stream' && Number(payload?.requestId) !== 1,
    )
    expect(secondGenerateCall).toBeDefined()
    const secondRequestId = Number(secondGenerateCall?.[1]?.requestId)

    await act(async () => {
      emitDesktopEvent('ollama-stream-chunk', {
        requestId: secondRequestId,
        response: 'Once upon a time. The old mansion had been abandoned for years.',
      })
      emitDesktopEvent('ollama-stream-done', { requestId: secondRequestId })
      pendingStreams.get(secondRequestId)?.resolve()
      emitDesktopEvent('ollama-stream-cancelled', { requestId: 1 })
      pendingStreams.get(1)?.resolve()
    })

    await waitFor(() => {
      expect(getEditor().value).toBe('Once upon a time. The old mansion had been abandoned for years.')
    })
  })
})
