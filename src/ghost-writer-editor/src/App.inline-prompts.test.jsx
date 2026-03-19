import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

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

function createAbortableStreamingResponse(chunk, signal) {
  const encoder = new TextEncoder()
  const payload = `${JSON.stringify({ response: chunk })}\n`
  let emittedChunk = false
  let aborted = Boolean(signal?.aborted)

  const waitForAbort = () =>
    new Promise((resolve) => {
      if (aborted) {
        resolve({ done: true })
        return
      }

      signal?.addEventListener(
        'abort',
        () => {
          aborted = true
          resolve({ done: true })
        },
        { once: true },
      )
    })

  return {
    ok: true,
    body: {
      getReader() {
        return {
          read: async () => {
            if (!emittedChunk) {
              emittedChunk = true
              return { done: false, value: encoder.encode(payload) }
            }

            return waitForAbort()
          },
          releaseLock() {},
          cancel: async () => {
            aborted = true
          },
        }
      },
    },
  }
}

function getEditor() {
  const editor = document.querySelector('textarea.editor__textarea')
  expect(editor).not.toBeNull()
  return editor
}

describe('App inline prompts', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('enables send when inline placeholders exist even with empty prompt input', async () => {
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

        return createStreamingResponse([''])
      }),
    )

    render(<App />)

    const sendButton = screen.getByLabelText('Send prompt')
    expect(sendButton).toBeDisabled()

    fireEvent.change(getEditor(), { target: { value: 'Intro {{add example}} outro' } })

    await waitFor(() => {
      expect(sendButton).not.toBeDisabled()
    })
  })

  it('renders inline placeholders with the inline prompt overlay token style', async () => {
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

        return createStreamingResponse([''])
      }),
    )

    render(<App />)
    fireEvent.change(getEditor(), { target: { value: 'Intro {{blue token}} outro' } })

    await waitFor(() => {
      const tokenNode = document.querySelector('.editor__inline-prompt-overlay-token')
      expect(tokenNode).not.toBeNull()
      expect(tokenNode.textContent).toBe('{{blue token}}')
    })
  })

  it('replaces a single inline token and prefixes prompt input instructions', async () => {
    const generateBodies = []

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input, options = {}) => {
        const url = String(input ?? '')
        if (url.includes('/ollama-models.json')) {
          return {
            ok: true,
            json: async () => ({ models: ['devstral-small-2:24b'] }),
          }
        }

        if (url.includes('/api/generate')) {
          generateBodies.push(JSON.parse(options.body))
          return createStreamingResponse(['README files usually explain setup and usage.'])
        }

        return {
          ok: false,
          body: null,
          json: async () => ({}),
        }
      }),
    )

    render(<App />)
    const sendButton = screen.getByLabelText('Send prompt')

    fireEvent.change(getEditor(), {
      target: {
        value: 'Markdown is common in docs. {{Give one quick README example sentence}} End.',
      },
    })

    fireEvent.change(screen.getByLabelText('Prompt input'), {
      target: { value: 'Keep it concise and plain.' },
    })

    await waitFor(() => {
      expect(sendButton).not.toBeDisabled()
    })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(getEditor().value).toBe('Markdown is common in docs. README files usually explain setup and usage. End.')
    })

    expect(generateBodies).toHaveLength(1)
    expect(generateBodies[0]?.prompt).toContain('Global request:\nKeep it concise and plain.')
    expect(generateBodies[0]?.prompt).toContain('Inline request:\nGive one quick README example sentence')
  })

  it('processes multiple inline placeholders sequentially left to right', async () => {
    const responses = ['FIRST', 'SECOND']
    let responseIndex = 0

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
          const chunk = responses[responseIndex] ?? ''
          responseIndex += 1
          return createStreamingResponse([chunk])
        }

        return {
          ok: false,
          body: null,
          json: async () => ({}),
        }
      }),
    )

    render(<App />)
    const sendButton = screen.getByLabelText('Send prompt')

    fireEvent.change(getEditor(), { target: { value: 'A {{one}} B {{two}} C' } })
    await waitFor(() => {
      expect(sendButton).not.toBeDisabled()
    })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(getEditor().value).toBe('A FIRST B SECOND C')
    })

    expect(responseIndex).toBe(2)
  })

  it('stops on inline failure and leaves remaining placeholders untouched', async () => {
    let generateCallCount = 0

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
          generateCallCount += 1
          if (generateCallCount === 1) {
            return createStreamingResponse(['FIRST'])
          }
          return {
            ok: false,
            body: null,
            json: async () => ({}),
          }
        }

        return {
          ok: false,
          body: null,
          json: async () => ({}),
        }
      }),
    )

    render(<App />)
    const sendButton = screen.getByLabelText('Send prompt')

    fireEvent.change(getEditor(), { target: { value: 'A {{one}} B {{two}} C' } })
    await waitFor(() => {
      expect(sendButton).not.toBeDisabled()
    })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText('Ollama request failed. Is the server running?')).toBeInTheDocument()
    })

    expect(getEditor().value).toBe('A FIRST B {{two}} C')
    expect(generateCallCount).toBe(2)
  })

  it('can stop an active streaming generation from the prompt button', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input, options = {}) => {
        const url = String(input ?? '')
        if (url.includes('/ollama-models.json')) {
          return {
            ok: true,
            json: async () => ({ models: ['devstral-small-2:24b'] }),
          }
        }

        if (url.includes('/api/generate')) {
          const { signal } = options
          return await new Promise((resolve, reject) => {
            signal?.addEventListener('abort', () => {
              const error = new Error('Generation stopped.')
              error.name = 'AbortError'
              reject(error)
            })

            // Keep request pending until user triggers stop.
            void resolve
          })
        }

        return {
          ok: false,
          body: null,
          json: async () => ({}),
        }
      }),
    )

    render(<App />)
    const sendButton = screen.getByLabelText('Send prompt')

    fireEvent.change(getEditor(), { target: { value: 'Document content' } })
    const promptInput = screen.getByLabelText('Prompt input')
    fireEvent.change(promptInput, { target: { value: 'Continue this sentence' } })

    await waitFor(() => {
      expect(sendButton).not.toBeDisabled()
    })
    fireEvent.click(sendButton)
    await waitFor(() => {
      expect(screen.getByLabelText('Stop generation')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Stop generation'))

    await waitFor(() => {
      expect(screen.getByText('Stopped')).toBeInTheDocument()
    })
    expect(screen.getByLabelText('Send prompt')).toBeInTheDocument()
  })

  it('continues from the latest generated cursor after stop and send again', async () => {
    let generateCallCount = 0
    const fetchMock = vi.fn(async (input, options = {}) => {
      const url = String(input ?? '')
      if (url.includes('/ollama-models.json')) {
        return {
          ok: true,
          json: async () => ({ models: ['devstral-small-2:24b'] }),
        }
      }

      if (url.includes('/api/generate')) {
        generateCallCount += 1
        if (generateCallCount === 1) {
          return createAbortableStreamingResponse('One', options.signal)
        }
        if (generateCallCount === 2) {
          return createAbortableStreamingResponse('Two', options.signal)
        }
        return createStreamingResponse(['Three'])
      }

      return {
        ok: false,
        body: null,
        json: async () => ({}),
      }
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    const editor = getEditor()
    fireEvent.change(editor, { target: { value: 'Alpha' } })
    editor.focus()
    editor.setSelectionRange(5, 5)
    fireEvent.select(editor)

    fireEvent.change(screen.getByLabelText('Prompt input'), { target: { value: 'continue writing' } })
    await waitFor(() => {
      expect(screen.getByLabelText('Send prompt')).not.toBeDisabled()
    })

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Send prompt'))
    })

    await waitFor(() => {
      expect(getEditor().value).toBe('AlphaOne')
    })

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Stop generation'))
    })

    await waitFor(() => {
      expect(screen.getByLabelText('Send prompt')).toBeInTheDocument()
      expect(getEditor().selectionStart).toBe(8)
      expect(getEditor().selectionEnd).toBe(8)
    })

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Send prompt'))
    })

    await waitFor(() => {
      expect(getEditor().value).toBe('AlphaOneTwo')
    })

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Stop generation'))
    })

    await waitFor(() => {
      expect(screen.getByLabelText('Send prompt')).toBeInTheDocument()
      expect(getEditor().selectionStart).toBe(11)
      expect(getEditor().selectionEnd).toBe(11)
    })

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Send prompt'))
    })

    await waitFor(() => {
      expect(getEditor().value).toBe('AlphaOneTwoThree')
    })
  })
})
