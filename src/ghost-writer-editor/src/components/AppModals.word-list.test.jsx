import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AppModals from './AppModals'

describe('AppModals word list', () => {
  it('saves enabled and disabled tag words from the Word List modal', () => {
    const updateSetting = vi.fn()
    const saveWordListSettings = vi.fn()

    render(
      <AppModals
        isAboutOpen={false}
        setIsAboutOpen={() => {}}
        isSettingsOpen={false}
        setIsSettingsOpen={() => {}}
        isWordListOpen
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
          customWordList: ['.png', '.jpg'],
          customWordListDisabled: ['.jpg'],
        }}
        updateSetting={updateSetting}
        saveWordListSettings={saveWordListSettings}
        models={[]}
        appName="Ghost Writer"
        appVersion="0.1.2"
      />,
    )

    const addInput = screen.getByPlaceholderText('Add words (comma separated)')
    fireEvent.change(addInput, {
      target: {
        value: 'GhostWriter, my-term',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    fireEvent.click(screen.getByRole('button', { name: 'Toggle .png' }))
    fireEvent.click(screen.getByRole('button', { name: 'Toggle .jpg' }))

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(saveWordListSettings).toHaveBeenCalledWith(['.jpg', 'GhostWriter', 'my-term'], ['.png'])
    expect(updateSetting).not.toHaveBeenCalled()
  })
})
