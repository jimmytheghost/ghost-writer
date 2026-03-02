import { useCallback, useState } from 'react'
import {
  DEFAULT_SETTINGS,
  normalizeTextZoom,
  readInitialAlwaysOnTop,
  resolveEnabledCustomWords,
} from '../lib/appUtils'
import { isDesktopRuntime, saveSettings } from '../lib/desktopRuntime'
import { setCustomSpellcheckWords } from '../lib/spellcheck'

/**
 * App settings and view state: theme, footer/preview/tab bar toggles,
 * spellcheck, text zoom, always-on-top, modal open state.
 * applySettings() updates all view state from a settings object (used after load).
 */
export function useAppSettings({ setSelectedModel } = {}) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [theme, setTheme] = useState('dark')
  const [isFooterCollapsed, setIsFooterCollapsed] = useState(true)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isSpellCheckEnabled, setIsSpellCheckEnabled] = useState(
    DEFAULT_SETTINGS.defaultSpellCheck,
  )
  const [editorTextZoomPercent, setEditorTextZoomPercent] = useState(() =>
    normalizeTextZoom(DEFAULT_SETTINGS.defaultTextZoom),
  )
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(() => readInitialAlwaysOnTop())
  const [isPromptPanelHidden, setIsPromptPanelHidden] = useState(false)
  const [isTabBarVisible, setIsTabBarVisible] = useState(true)
  const [isColoredStreamingOutputEnabled, setIsColoredStreamingOutputEnabled] = useState(true)

  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isWordListOpen, setIsWordListOpen] = useState(false)
  const [isTextZoomOpen, setIsTextZoomOpen] = useState(false)
  const [isSpellCheckScanOpen, setIsSpellCheckScanOpen] = useState(false)
  const [spellCheckScanStatus, setSpellCheckScanStatus] = useState('')
  const [spellCheckScanItems, setSpellCheckScanItems] = useState([])
  const [spellCheckScanTotal, setSpellCheckScanTotal] = useState(0)

  const applySettings = useCallback(
    (nextSettings) => {
      setTheme(nextSettings.defaultTheme === 'light' ? 'light' : 'dark')
      setEditorTextZoomPercent(normalizeTextZoom(nextSettings.defaultTextZoom))
      setIsAlwaysOnTop(Boolean(nextSettings.defaultAlwaysOnTop))
      setIsFooterCollapsed(Boolean(nextSettings.defaultFooterCollapsed))
      setIsPreviewOpen(Boolean(nextSettings.defaultStartupPreview))
      setIsSpellCheckEnabled(Boolean(nextSettings.defaultSpellCheck))
      const customWordList = Array.isArray(nextSettings.customWordList)
        ? nextSettings.customWordList
        : DEFAULT_SETTINGS.customWordList
      const customWordListDisabled = Array.isArray(nextSettings.customWordListDisabled)
        ? nextSettings.customWordListDisabled
        : DEFAULT_SETTINGS.customWordListDisabled
      setCustomSpellcheckWords(resolveEnabledCustomWords(customWordList, customWordListDisabled))
      if (nextSettings.defaultModel && setSelectedModel) {
        setSelectedModel(nextSettings.defaultModel)
      }
    },
    [setSelectedModel],
  )

  const updateSetting = useCallback(
    async (key, value) => {
      setSettings((current) => {
        const next = { ...current, [key]: value }
        if (isDesktopRuntime()) {
          void saveSettings(next)
        }
        return next
      })

      if (key === 'defaultTheme') setTheme(value === 'light' ? 'light' : 'dark')
      if (key === 'defaultTextZoom') setEditorTextZoomPercent(normalizeTextZoom(value))
      if (key === 'defaultAlwaysOnTop') setIsAlwaysOnTop(Boolean(value))
      if (key === 'defaultFooterCollapsed') setIsFooterCollapsed(Boolean(value))
      if (key === 'defaultStartupPreview') setIsPreviewOpen(Boolean(value))
      if (key === 'defaultSpellCheck') setIsSpellCheckEnabled(Boolean(value))
      if (key === 'defaultModel' && setSelectedModel) setSelectedModel(value || '')
    },
    [setSelectedModel],
  )

  return {
    settings,
    setSettings,
    theme,
    isFooterCollapsed,
    setIsFooterCollapsed,
    isPreviewOpen,
    setIsPreviewOpen,
    isSpellCheckEnabled,
    setIsSpellCheckEnabled,
    editorTextZoomPercent,
    setEditorTextZoomPercent,
    isAlwaysOnTop,
    setIsAlwaysOnTop,
    isPromptPanelHidden,
    setIsPromptPanelHidden,
    isTabBarVisible,
    setIsTabBarVisible,
    isColoredStreamingOutputEnabled,
    setIsColoredStreamingOutputEnabled,
    isAboutOpen,
    setIsAboutOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isWordListOpen,
    setIsWordListOpen,
    isTextZoomOpen,
    setIsTextZoomOpen,
    isSpellCheckScanOpen,
    setIsSpellCheckScanOpen,
    spellCheckScanStatus,
    setSpellCheckScanStatus,
    spellCheckScanItems,
    setSpellCheckScanItems,
    spellCheckScanTotal,
    setSpellCheckScanTotal,
    applySettings,
    updateSetting,
  }
}
