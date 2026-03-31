import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AppModals from './AppModals'

vi.mock('../lib/desktopRuntime', () => ({
  isDesktopRuntime: () => true,
  openExternalUrl: vi.fn(),
}))

describe('AppModals settings', () => {
  it('does not show text zoom in settings modal', () => {
    const updateSetting = vi.fn()

    render(
      <AppModals
        isAboutOpen={false}
        setIsAboutOpen={() => {}}
        isSettingsOpen
        setIsSettingsOpen={() => {}}
        isWordListOpen={false}
        setIsWordListOpen={() => {}}
        isTextZoomOpen={false}
        setIsTextZoomOpen={() => {}}
        settings={{
          defaultModel: '',
          defaultTheme: 'dark',
          defaultTextZoom: '100%',
          defaultAlwaysOnTop: false,
          defaultFooterCollapsed: true,
          defaultStartupPreview: false,
          defaultSpellCheck: false,
          defaultShowMdPrompts: true,
          promptHoverBorderEnabled: true,
          autoSaveEnabled: false,
          autoSaveIntervalSeconds: 60,
          ollamaBaseUrl: 'http://127.0.0.1:11434',
          customWordList: [],
          customWordListDisabled: [],
        }}
        updateSetting={updateSetting}
        saveWordListSettings={() => {}}
        textZoomOptions={['50%', '75%', '100%', '125%', '150%']}
        models={[]}
        appName="Ghost Writer"
        appVersion="0.1.2"
      />,
    )

    expect(screen.queryByLabelText('Editor text zoom')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Auto save interval (seconds)')).toBeInTheDocument()
    expect(screen.getByLabelText('Default spell check in editor')).toBeInTheDocument()
    expect(screen.queryByLabelText('Auto save backup iterations')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Default model'))
    fireEvent.click(screen.getByRole('option', { name: 'Use current model' }))
    expect(updateSetting).toHaveBeenCalledWith('defaultModel', '')

    fireEvent.change(screen.getByLabelText('Default theme'), { target: { value: 'light' } })
    expect(updateSetting).toHaveBeenCalledWith('defaultTheme', 'light')

    fireEvent.click(screen.getByLabelText('Auto save (saved files only)'))
    expect(updateSetting).toHaveBeenCalledWith('autoSaveEnabled', true)

    fireEvent.click(screen.getByLabelText('Show MD prompts in preview/export by default'))
    expect(updateSetting).toHaveBeenCalledWith('defaultShowMdPrompts', false)

    fireEvent.click(screen.getByLabelText('Show contrasting hover border on prompt input'))
    expect(updateSetting).toHaveBeenCalledWith('promptHoverBorderEnabled', false)

    fireEvent.change(screen.getByLabelText('Auto save interval (seconds)'), { target: { value: '30' } })
    expect(updateSetting).toHaveBeenCalledWith('autoSaveIntervalSeconds', 30)

    fireEvent.change(screen.getByLabelText('Ollama endpoint'), { target: { value: 'http://localhost:11435/' } })
    fireEvent.blur(screen.getByLabelText('Ollama endpoint'))
    expect(updateSetting).toHaveBeenCalledWith('ollamaBaseUrl', 'http://localhost:11435')

  })

  it('updates text zoom from text zoom modal', () => {
    const updateSetting = vi.fn()

    render(
      <AppModals
        isAboutOpen={false}
        setIsAboutOpen={() => {}}
        isSettingsOpen={false}
        setIsSettingsOpen={() => {}}
        isWordListOpen={false}
        setIsWordListOpen={() => {}}
        isTextZoomOpen
        setIsTextZoomOpen={() => {}}
        settings={{
          defaultModel: '',
          defaultTheme: 'dark',
          defaultTextZoom: '100%',
          defaultAlwaysOnTop: false,
          defaultFooterCollapsed: true,
          defaultStartupPreview: false,
          defaultSpellCheck: false,
          defaultShowMdPrompts: true,
          promptHoverBorderEnabled: true,
          autoSaveEnabled: false,
          autoSaveIntervalSeconds: 60,
          ollamaBaseUrl: 'http://127.0.0.1:11434',
          customWordList: [],
          customWordListDisabled: [],
        }}
        updateSetting={updateSetting}
        saveWordListSettings={() => {}}
        textZoomOptions={['50%', '75%', '100%', '125%', '150%']}
        models={[]}
        appName="Ghost Writer"
        appVersion="0.1.2"
      />,
    )

    fireEvent.change(screen.getByLabelText('Editor text zoom'), { target: { value: '4' } })
    expect(updateSetting).toHaveBeenCalledWith('defaultTextZoom', '150%')
  })

  it('shows check-for-update controls in About Ghost Writer', () => {
    const onCheckForUpdates = vi.fn()

    render(
      <AppModals
        isAboutOpen
        setIsAboutOpen={() => {}}
        isSettingsOpen={false}
        setIsSettingsOpen={() => {}}
        isWordListOpen={false}
        setIsWordListOpen={() => {}}
        isTextZoomOpen={false}
        setIsTextZoomOpen={() => {}}
        settings={{
          defaultModel: '',
          defaultTheme: 'dark',
          defaultTextZoom: '100%',
          defaultAlwaysOnTop: false,
          defaultFooterCollapsed: true,
          defaultStartupPreview: false,
          defaultSpellCheck: false,
          defaultShowMdPrompts: true,
          autoSaveEnabled: false,
          autoSaveIntervalSeconds: 60,
          ollamaBaseUrl: 'http://127.0.0.1:11434',
          customWordList: [],
          customWordListDisabled: [],
        }}
        updateSetting={() => {}}
        saveWordListSettings={() => {}}
        textZoomOptions={['50%', '75%', '100%', '125%', '150%']}
        models={[]}
        appName="Ghost Writer"
        appVersion="1.5.1"
        onCheckForUpdates={onCheckForUpdates}
        updateCheckStatus="Update available: Version 1.5.2."
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Check for update' }))
    expect(onCheckForUpdates).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Update available: Version 1.5.2.')).toBeInTheDocument()
  })

  it('disables check-for-update button while checking', () => {
    render(
      <AppModals
        isAboutOpen
        setIsAboutOpen={() => {}}
        isSettingsOpen={false}
        setIsSettingsOpen={() => {}}
        isWordListOpen={false}
        setIsWordListOpen={() => {}}
        isTextZoomOpen={false}
        setIsTextZoomOpen={() => {}}
        settings={{
          defaultModel: '',
          defaultTheme: 'dark',
          defaultTextZoom: '100%',
          defaultAlwaysOnTop: false,
          defaultFooterCollapsed: true,
          defaultStartupPreview: false,
          defaultSpellCheck: false,
          defaultShowMdPrompts: true,
          autoSaveEnabled: false,
          autoSaveIntervalSeconds: 60,
          ollamaBaseUrl: 'http://127.0.0.1:11434',
          customWordList: [],
          customWordListDisabled: [],
        }}
        updateSetting={() => {}}
        saveWordListSettings={() => {}}
        textZoomOptions={['50%', '75%', '100%', '125%', '150%']}
        models={[]}
        appName="Ghost Writer"
        appVersion="1.5.1"
        onCheckForUpdates={() => {}}
        isCheckingForUpdates
        updateCheckStatus="Checking for updates..."
      />,
    )

    expect(screen.getByRole('button', { name: 'Checking for updates...' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Checking for updates...')
  })

  it('shows a quick-start download button for llama3.1:8b', async () => {
    const onDownloadQuickStartModel = vi.fn()

    render(
      <AppModals
        isAboutOpen
        setIsAboutOpen={() => {}}
        isSettingsOpen={false}
        setIsSettingsOpen={() => {}}
        isWordListOpen={false}
        setIsWordListOpen={() => {}}
        isTextZoomOpen={false}
        setIsTextZoomOpen={() => {}}
        settings={{
          defaultModel: '',
          defaultTheme: 'dark',
          defaultTextZoom: '100%',
          defaultAlwaysOnTop: false,
          defaultFooterCollapsed: true,
          defaultStartupPreview: false,
          defaultSpellCheck: false,
          defaultShowMdPrompts: true,
          autoSaveEnabled: false,
          autoSaveIntervalSeconds: 60,
          ollamaBaseUrl: 'http://127.0.0.1:11434',
          customWordList: [],
          customWordListDisabled: [],
        }}
        updateSetting={() => {}}
        saveWordListSettings={() => {}}
        textZoomOptions={['50%', '75%', '100%', '125%', '150%']}
        models={[]}
        appName="Ghost Writer"
        appVersion="1.5.1"
        onDownloadQuickStartModel={onDownloadQuickStartModel}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Download llama3.1:8b' }))
    await waitFor(() => {
      expect(onDownloadQuickStartModel).toHaveBeenCalledTimes(1)
    })
  })
})
