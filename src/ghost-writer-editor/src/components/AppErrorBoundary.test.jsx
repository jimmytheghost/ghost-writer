import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppErrorBoundary from './AppErrorBoundary'

function CrashOnRender() {
  throw new Error('render exploded')
}

describe('AppErrorBoundary', () => {
  const originalLocation = window.location

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: vi.fn() },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
    vi.restoreAllMocks()
  })

  it('catches a child render error and shows fallback UI', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <AppErrorBoundary>
        <CrashOnRender />
      </AppErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Ghost Writer hit an unexpected error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy diagnostics' })).toBeInTheDocument()
    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('copies diagnostics from fallback action', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(
      <AppErrorBoundary>
        <CrashOnRender />
      </AppErrorBoundary>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy diagnostics' }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1)
    })
    expect(writeText.mock.calls[0][0]).toContain('Ghost Writer crash diagnostics')
    expect(writeText.mock.calls[0][0]).toContain('render exploded')
    expect(screen.getByRole('status')).toHaveTextContent('Diagnostics copied to clipboard.')
    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('reloads the page from fallback action', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const reloadSpy = vi.spyOn(window.location, 'reload')

    render(
      <AppErrorBoundary>
        <CrashOnRender />
      </AppErrorBoundary>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reload app' }))

    expect(reloadSpy).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).toHaveBeenCalled()
  })
})
