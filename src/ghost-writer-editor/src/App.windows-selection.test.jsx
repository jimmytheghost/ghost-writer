import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const useModelLoaderMock = vi.hoisted(() =>
  vi.fn(() => ({
    isLoadingModels: false,
    loadModels: vi.fn(async () => {}),
    modelLoadStatus: 'Loaded 1 model(s) from cached snapshot.',
    models: ['devstral-small-2:24b'],
    selectedModel: 'devstral-small-2:24b',
    setSelectedModel: vi.fn(),
  })),
)

vi.mock('./hooks/useModelLoader', () => ({
  useModelLoader: useModelLoaderMock,
}))

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

function createStreamingResponse(chunks) {
  const encoder = new TextEncoder()
  const payload = chunks.map((chunk) => `${JSON.stringify({ response: chunk })}\n`).join('')

  return {
    ok: true,
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(payload))
        controller.close()
      },
    }),
  }
}

function getEditor() {
  const editor = document.querySelector('textarea.editor__textarea')
  expect(editor).not.toBeNull()
  return editor
}

describe('App Windows selection integration', () => {
  let restorePlatform
  let consoleErrorSpy

  beforeEach(() => {
    restorePlatform = mockNavigatorPlatform('Win32')
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      const payload = args
        .map((entry) => (typeof entry === 'string' ? entry : String(entry ?? '')))
        .join(' ')
      if (payload.includes('not wrapped in act')) return
    })
  })

  afterEach(() => {
    restorePlatform?.()
    consoleErrorSpy?.mockRestore()
    vi.unstubAllGlobals()
  })

  it('shows selected text beside the prompt on Windows after editor blur', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ models: ['devstral-small-2:24b'] }),
      })),
    )

    render(<App />)

    const editor = getEditor()
    fireEvent.change(editor, { target: { value: 'alpha beta gamma' } })

    editor.focus()
    editor.setSelectionRange(6, 10)
    fireEvent.select(editor)

    await act(async () => {
      fireEvent.focus(screen.getByLabelText('Prompt input'))
    })

    await waitFor(() => {
      expect(screen.getByText('Selected text')).toBeInTheDocument()
      expect(screen.getByText('beta')).toBeInTheDocument()
      expect(screen.getByText('4 chars')).toBeInTheDocument()
    })

    expect(document.querySelector('.editor__selection-overlay')).toBeNull()
  })

  it('uses saved Windows selection context when submitting a prompt', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input) => {
        const url = String(input ?? '')
        if (url.includes('/ollama-models.json')) {
          return {
            ok: true,
            json: async () => ({ models: ['devstral-small-2:24b'] }),
          }
        }

        if (url.includes('/api/generate')) {
          return createStreamingResponse(['BETA'])
        }

        return {
          ok: false,
          body: null,
          json: async () => ({}),
        }
      }),
    )

    render(<App />)

    const editor = getEditor()
    fireEvent.change(editor, { target: { value: 'alpha beta gamma' } })
    editor.focus()
    editor.setSelectionRange(6, 10)
    fireEvent.select(editor)

    const promptInput = screen.getByLabelText('Prompt input')
    await act(async () => {
      fireEvent.focus(promptInput)
      fireEvent.change(promptInput, { target: { value: 'tighten this' } })
    })

    const sendButton = screen.getByLabelText('Send prompt')
    await waitFor(() => {
      expect(sendButton).not.toBeDisabled()
    })

    await act(async () => {
      fireEvent.click(sendButton)
    })

    await waitFor(() => {
      expect(getEditor().value).toBe('alpha BETA gamma')
    })

    await waitFor(() => {
      expect(screen.queryByText('Selected text')).toBeNull()
    })

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Undo generation'))
    })

    await waitFor(() => {
      expect(screen.queryByText('Selected text')).toBeNull()
      expect(screen.queryByText('Selected text changed')).toBeNull()
    })
  })

  it('blocks submission when a saved Windows selection becomes stale', async () => {
    const fetchMock = vi.fn(async (input) => {
      const url = String(input ?? '')
      if (url.includes('/ollama-models.json')) {
        return {
          ok: true,
          json: async () => ({ models: ['devstral-small-2:24b'] }),
        }
      }

      return createStreamingResponse(['ignored'])
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    const editor = getEditor()
    fireEvent.change(editor, { target: { value: 'alpha beta gamma' } })
    editor.focus()
    editor.setSelectionRange(6, 10)
    fireEvent.select(editor)

    const promptInput = screen.getByLabelText('Prompt input')
    await act(async () => {
      fireEvent.focus(promptInput)
      fireEvent.change(promptInput, { target: { value: 'tighten this' } })
    })

    await act(async () => {
      fireEvent.change(editor, { target: { value: 'alpha beta gamma delta' } })
    })

    await waitFor(() => {
      expect(screen.getByText('Selected text changed')).toBeInTheDocument()
      expect(screen.getByText('Selection changed. Reselect text and try again.')).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Send prompt'))
    })

    await waitFor(() => {
      expect(screen.getAllByText('Selection changed. Reselect text and try again.')).toHaveLength(2)
    })
  })
})
