import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AppModals from './AppModals'

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
    fireEvent.change(screen.getByLabelText('Default theme'), { target: { value: 'light' } })
    expect(updateSetting).toHaveBeenCalledWith('defaultTheme', 'light')
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
})
