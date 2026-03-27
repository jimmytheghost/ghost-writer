import { useEffect, useMemo, useState } from 'react'
import { isDesktopRuntime, openExternalUrl } from '../lib/desktopRuntime'
import { normalizeOllamaBaseUrl } from '../lib/appUtils'
import ModelDropdown from './ModelDropdown'

function uniqueWords(values = []) {
  const seen = new Set()
  const words = []

  for (const value of values) {
    const word = String(value ?? '').trim()
    if (!word) continue
    const key = word.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    words.push(word)
  }

  return words
}

function buildWordEntries(enabledWords = [], disabledWords = []) {
  const enabled = uniqueWords(enabledWords)
  const disabled = uniqueWords(disabledWords)
  const disabledSet = new Set(disabled.map((word) => word.toLowerCase()))
  const entries = enabled.map((word) => ({ word, enabled: !disabledSet.has(word.toLowerCase()) }))

  for (const word of disabled) {
    const key = word.toLowerCase()
    if (entries.some((entry) => entry.word.toLowerCase() === key)) continue
    entries.push({ word, enabled: false })
  }

  return entries
}

function splitWordInput(value = '') {
  return value
    .split(',')
    .map((word) => word.trim())
    .filter(Boolean)
}

function useEscapeToClose(isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return undefined

    const handleEscape = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])
}

function WordListModal({
  initialEnabledWords,
  initialDisabledWords,
  onClose,
  onSave,
}) {
  const [entries, setEntries] = useState(() => buildWordEntries(initialEnabledWords, initialDisabledWords))
  const [pendingWord, setPendingWord] = useState('')

  const counts = useMemo(() => {
    let enabled = 0
    for (const entry of entries) {
      if (entry.enabled) enabled += 1
    }
    return { enabled, total: entries.length }
  }, [entries])

  const addPendingWords = () => {
    const nextWords = splitWordInput(pendingWord)
    if (!nextWords.length) return

    setEntries((current) => {
      const next = [...current]
      for (const word of nextWords) {
        const key = word.toLowerCase()
        const existing = next.find((entry) => entry.word.toLowerCase() === key)
        if (existing) {
          existing.enabled = true
          continue
        }
        next.push({ word, enabled: true })
      }
      return next
    })
    setPendingWord('')
  }

  const toggleWord = (targetWord) => {
    setEntries((current) =>
      current.map((entry) =>
        entry.word.toLowerCase() === targetWord.toLowerCase()
          ? { ...entry, enabled: !entry.enabled }
          : entry,
      ),
    )
  }

  const removeWord = (targetWord) => {
    setEntries((current) => current.filter((entry) => entry.word.toLowerCase() !== targetWord.toLowerCase()))
  }

  const handleSave = () => {
    const enabledWords = []
    const disabledWords = []
    for (const entry of entries) {
      if (entry.enabled) enabledWords.push(entry.word)
      else disabledWords.push(entry.word)
    }
    onSave(enabledWords, disabledWords)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal--word-list"
        role="dialog"
        aria-modal="true"
        aria-labelledby="word-list-title"
        aria-describedby="word-list-description"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="word-list-title" className="modal__title">Word List</h2>
        <p id="word-list-description" className="modal__description">
          Toggle tags on/off to control spellcheck. On = allowed, Off = flagged.
        </p>

        <div className="word-list__add-row">
          <input
            type="text"
            className="modal__input word-list__input"
            value={pendingWord}
            onChange={(event) => setPendingWord(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              addPendingWords()
            }}
            placeholder="Add words (comma separated)"
            spellCheck={false}
          />
          <button type="button" className="modal__button word-list__add-button" onClick={addPendingWords}>
            Add
          </button>
        </div>

        <div className="word-list__status">
          {counts.enabled} enabled / {counts.total} total
        </div>

        <div className="word-list__tags" role="list" aria-label="Word list entries">
          {entries.map((entry) => (
            <div
              key={entry.word.toLowerCase()}
              role="listitem"
              className={`word-tag${entry.enabled ? ' word-tag--enabled' : ' word-tag--disabled'}`}
            >
              <button
                type="button"
                className="word-tag__toggle"
                onClick={() => toggleWord(entry.word)}
                aria-label={`Toggle ${entry.word}`}
              >
                {entry.word}
              </button>
              <button
                type="button"
                className="word-tag__remove"
                onClick={() => removeWord(entry.word)}
                aria-label={`Remove ${entry.word}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="modal__actions">
          <button type="button" className="modal__button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="modal__button modal__button--primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function OllamaEndpointField({ value = '', onCommit }) {
  const [draftValue, setDraftValue] = useState(value)

  const commitDraft = () => {
    const normalized = normalizeOllamaBaseUrl(draftValue)
    setDraftValue(normalized)
    onCommit(normalized)
  }

  return (
    <>
      <label className="modal__label" htmlFor="settings-ollama-base-url">
        Ollama endpoint
      </label>
      <input
        id="settings-ollama-base-url"
        type="url"
        className="modal__input"
        value={draftValue}
        placeholder="http://127.0.0.1:11434"
        onChange={(event) => {
          setDraftValue(event.target.value)
        }}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          commitDraft()
        }}
      />
    </>
  )
}

function AppModals({
  isAboutOpen,
  setIsAboutOpen,
  isSettingsOpen,
  setIsSettingsOpen,
  isWordListOpen,
  setIsWordListOpen,
  isTextZoomOpen,
  setIsTextZoomOpen,
  isSpellCheckScanOpen = false,
  setIsSpellCheckScanOpen = () => {},
  spellCheckScanStatus = '',
  spellCheckScanItems = [],
  spellCheckScanTotal = 0,
  settings,
  updateSetting,
  saveWordListSettings,
  textZoomOptions = ['50%', '100%', '150%', '200%'],
  models,
  appName,
  appVersion,
  alreadyOpenTab = null,
  onConfirmAlreadyOpen = () => {},
  dirtyCloseConfirmTab = null,
  onConfirmDirtyCloseSave = () => {},
  onConfirmDirtyCloseDiscard = () => {},
  onCancelDirtyCloseConfirm = () => {},
  onExportDiagnostics = () => {},
  onCheckForUpdates = () => {},
  isCheckingForUpdates = false,
  updateCheckStatus = '',
}) {
  const normalizedWordList = Array.isArray(settings.customWordList) ? settings.customWordList : []
  const normalizedDisabledWordList = Array.isArray(settings.customWordListDisabled)
    ? settings.customWordListDisabled
    : []
  const currentTextZoomValue = settings.defaultTextZoom ?? '100%'
  const currentTextZoomIndex = Math.max(0, textZoomOptions.indexOf(currentTextZoomValue))
  useEscapeToClose(isSettingsOpen, () => setIsSettingsOpen(false))
  useEscapeToClose(isWordListOpen, () => setIsWordListOpen(false))
  useEscapeToClose(isTextZoomOpen, () => setIsTextZoomOpen(false))
  useEscapeToClose(isSpellCheckScanOpen, () => setIsSpellCheckScanOpen(false))
  useEscapeToClose(isAboutOpen, () => setIsAboutOpen(false))
  useEscapeToClose(Boolean(alreadyOpenTab), onConfirmAlreadyOpen)
  useEscapeToClose(Boolean(dirtyCloseConfirmTab), onCancelDirtyCloseConfirm)

  const handleAboutLinkClick = (event) => {
    const anchor = event.target.closest('a[href]')
    if (!(anchor instanceof HTMLAnchorElement)) return

    if (isDesktopRuntime()) {
      event.preventDefault()
      void openExternalUrl(anchor.href)
    }
  }

  return (
    <>
      {alreadyOpenTab && (
        <div className="modal-overlay" onClick={onConfirmAlreadyOpen}>
          <div
            className="modal modal--confirm-close"
            role="dialog"
            aria-modal="true"
            aria-labelledby="already-open-title"
            aria-describedby="already-open-description"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal__icon-button modal__icon-button--close"
              aria-label="Switch to already open tab"
              onClick={onConfirmAlreadyOpen}
            >
              <span aria-hidden="true" className="modal__icon-glyph">×</span>
            </button>
            <h2 id="already-open-title" className="modal__title">This file is already open</h2>
            <p id="already-open-description" className="modal__description">
              <strong>{alreadyOpenTab.filePath || alreadyOpenTab.title || 'This file'}</strong> is
              already open in another tab. Switch to that tab to continue.
            </p>
            <div className="modal__actions">
              <button
                type="button"
                className="modal__button modal__button--primary"
                onClick={onConfirmAlreadyOpen}
              >
                Switch to tab
              </button>
            </div>
          </div>
        </div>
      )}
      {dirtyCloseConfirmTab && (
        <div className="modal-overlay" onClick={onCancelDirtyCloseConfirm}>
          <div
            className="modal modal--confirm-close"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dirty-close-confirm-title"
            aria-describedby="dirty-close-confirm-description"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal__icon-button modal__icon-button--close"
              aria-label="Cancel close confirmation"
              onClick={onCancelDirtyCloseConfirm}
            >
              <span aria-hidden="true" className="modal__icon-glyph">×</span>
            </button>
            <h2 id="dirty-close-confirm-title" className="modal__title">Save before closing?</h2>
            <p id="dirty-close-confirm-description" className="modal__description">
              This tab has unsaved changes. Choose <strong>Yes</strong> to open the save dialog, or{' '}
              <strong>No</strong> to close without saving. Press <strong>Esc</strong> or click outside to cancel.
            </p>
            <div className="modal__confirm-file" aria-label="Tab being closed">
              <div className="modal__confirm-label">File</div>
              <div className="modal__confirm-name">{dirtyCloseConfirmTab.title || 'Untitled'}</div>
            </div>
            <div className="modal__actions">
              <button type="button" className="modal__button" onClick={onConfirmDirtyCloseDiscard}>
                No
              </button>
              <button
                type="button"
                className="modal__button modal__button--primary"
                onClick={onConfirmDirtyCloseSave}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div
            className="modal modal--settings"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            aria-describedby="settings-description"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="settings-title" className="modal__title">Settings</h2>
            <p id="settings-description" className="modal__description">Defaults are applied instantly and saved for next launch.</p>

            <label className="modal__label" htmlFor="settings-model">
              Default model
            </label>
            <ModelDropdown
              id="settings-model"
              ariaLabel="Default model"
              value={settings.defaultModel}
              options={models}
              onChange={(nextValue) => updateSetting('defaultModel', nextValue)}
              includeEmptyOption
              emptyOptionLabel="Use current model"
              placement="bottom"
            />

            <label className="modal__label" htmlFor="settings-theme">
              Default theme
            </label>
            <select
              id="settings-theme"
              className="modal__input modal__select"
              value={settings.defaultTheme}
              onChange={(event) => updateSetting('defaultTheme', event.target.value)}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>

            <label className="modal__checkbox">
              <input
                type="checkbox"
                checked={settings.defaultAlwaysOnTop}
                onChange={(event) => updateSetting('defaultAlwaysOnTop', event.target.checked)}
              />
              Default always on top
            </label>
            <label className="modal__checkbox">
              <input
                type="checkbox"
                checked={settings.defaultFooterCollapsed}
                onChange={(event) => updateSetting('defaultFooterCollapsed', event.target.checked)}
              />
              Default footer collapsed
            </label>
            <label className="modal__checkbox">
              <input
                type="checkbox"
                checked={settings.defaultStartupPreview}
                onChange={(event) => updateSetting('defaultStartupPreview', event.target.checked)}
              />
              Default startup preview mode
            </label>
            <label className="modal__checkbox">
              <input
                type="checkbox"
                checked={Boolean(settings.defaultSpellCheck)}
                onChange={(event) => updateSetting('defaultSpellCheck', event.target.checked)}
              />
              Default spell check in editor
            </label>
            <label className="modal__checkbox">
              <input
                type="checkbox"
                checked={Boolean(settings.defaultShowMdPrompts)}
                onChange={(event) => updateSetting('defaultShowMdPrompts', event.target.checked)}
              />
              Show MD prompts in preview/export by default
            </label>
            <label className="modal__checkbox">
              <input
                type="checkbox"
                checked={Boolean(settings.promptHoverBorderEnabled)}
                onChange={(event) => updateSetting('promptHoverBorderEnabled', event.target.checked)}
              />
              Show contrasting hover border on prompt input
            </label>
            <label className="modal__checkbox">
              <input
                type="checkbox"
                checked={Boolean(settings.autoSaveEnabled)}
                onChange={(event) => updateSetting('autoSaveEnabled', event.target.checked)}
              />
              Auto save (saved files only)
            </label>
            <label className="modal__label" htmlFor="settings-auto-save-interval">
              Auto save interval (seconds)
            </label>
            <input
              id="settings-auto-save-interval"
              type="number"
              min={5}
              max={3600}
              className="modal__input"
              value={Number(settings.autoSaveIntervalSeconds ?? 60)}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10)
                const safeValue = Number.isFinite(parsed) ? Math.min(3600, Math.max(5, parsed)) : 60
                updateSetting('autoSaveIntervalSeconds', safeValue)
              }}
            />
            {isDesktopRuntime() && (
              <OllamaEndpointField
                key={settings.ollamaBaseUrl ?? ''}
                value={settings.ollamaBaseUrl ?? ''}
                onCommit={(nextValue) => updateSetting('ollamaBaseUrl', nextValue)}
              />
            )}

            <div className="modal__actions">
              <button type="button" className="modal__button modal__button--primary" onClick={() => setIsSettingsOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {isWordListOpen && (
        <WordListModal
          initialEnabledWords={normalizedWordList}
          initialDisabledWords={normalizedDisabledWordList}
          onClose={() => setIsWordListOpen(false)}
          onSave={saveWordListSettings}
        />
      )}
      {isTextZoomOpen && (
        <div className="modal-overlay" onClick={() => setIsTextZoomOpen(false)}>
          <div
            className="modal modal--settings"
            role="dialog"
            aria-modal="true"
            aria-labelledby="text-zoom-title"
            aria-describedby="text-zoom-description"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="text-zoom-title" className="modal__title">Text Zoom</h2>
            <p id="text-zoom-description" className="modal__description">Applies to text editor view only.</p>

            <label className="modal__label" htmlFor="settings-text-zoom">
              Editor text zoom
            </label>
            <input
              id="settings-text-zoom"
              type="range"
              className="text-zoom__slider"
              min={0}
              max={Math.max(0, textZoomOptions.length - 1)}
              step={1}
              value={currentTextZoomIndex}
              onChange={(event) => {
                const index = Number.parseInt(event.target.value, 10)
                const option = textZoomOptions[index] ?? textZoomOptions[2] ?? '100%'
                updateSetting('defaultTextZoom', option)
              }}
              aria-valuetext={currentTextZoomValue}
            />
            <div className="text-zoom__marks" aria-hidden="true">
              {textZoomOptions.map((option, index) => (
                <span
                  key={option}
                  className={`text-zoom__mark${index <= currentTextZoomIndex ? ' text-zoom__mark--active' : ''}`}
                >
                  {option}
                </span>
              ))}
            </div>
            <div className="text-zoom__value" aria-live="polite">
              {currentTextZoomValue}
            </div>

            <div className="modal__actions">
              <button
                type="button"
                className="modal__button modal__button--primary"
                onClick={() => setIsTextZoomOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {isSpellCheckScanOpen && (
        <div className="modal-overlay" onClick={() => setIsSpellCheckScanOpen(false)}>
          <div
            className="modal modal--settings"
            role="dialog"
            aria-modal="true"
            aria-labelledby="spell-scan-title"
            aria-describedby="spell-scan-description"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="spell-scan-title" className="modal__title">Spell Check</h2>
            <p id="spell-scan-description" className="modal__description">
              {spellCheckScanStatus || `Found ${spellCheckScanTotal} potential misspelling${spellCheckScanTotal === 1 ? '' : 's'}.`}
            </p>
            {!spellCheckScanStatus && spellCheckScanItems.length > 0 && (
              <ul>
                {spellCheckScanItems.map((item) => (
                  <li key={item.word}>
                    {item.word} ({item.count})
                  </li>
                ))}
              </ul>
            )}
            {!spellCheckScanStatus && spellCheckScanItems.length === 0 && <p>No misspellings found.</p>}
            <div className="modal__actions">
              <button
                type="button"
                className="modal__button modal__button--primary"
                onClick={() => setIsSpellCheckScanOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {isAboutOpen && (
        <div className="modal-overlay" onClick={() => setIsAboutOpen(false)}>
          <div
            className="modal about-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            aria-describedby="about-description"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="about-modal__header">
              <img
                className="about-modal__logo"
                src="/ghost-writer-logo.png"
                alt={`${appName} logo`}
                width="64"
                height="64"
              />
              <div className="about-modal__title-block">
                <h2 id="about-title" className="modal__title about-modal__app-name">{appName}</h2>
                <div className="about-modal__meta">Version {appVersion}</div>
                <div className="about-modal__meta">Vibe Coded by JimmyTheGhost (www.JimmyWeber.com)</div>
              </div>
            </div>
            <hr className="about-modal__divider" />
            <div id="about-description" className="about-modal__body" onClick={handleAboutLinkClick}>
              <p>
                Ghost Writer is a private, distraction-free markdown editor. It uses private, local LLMs to help you write.
              </p>
              <p>
                Browse different LLMs on the{' '}
                <a href="https://ollama.com/library" target="_blank" rel="noreferrer">
                  Ollama model library
                </a>{' '}
                and read the{' '}
                <a href="https://github.com/ollama/ollama/blob/main/README.md" target="_blank" rel="noreferrer">
                  Ollama docs
                </a>{' '}
                to learn more.
              </p>
              <p>Quick start to download a model:</p>
              <pre className="about-modal__code">ollama pull llama3.1:8b</pre>
              <p>Then restart Ghost Writer and you’re ready to write.</p>
              {updateCheckStatus ? (
                <p className="about-modal__meta" role="status" aria-live="polite">
                  {updateCheckStatus}
                </p>
              ) : null}
            </div>
            <div className="modal__actions">
              <button
                type="button"
                className="modal__button"
                onClick={onCheckForUpdates}
                disabled={isCheckingForUpdates}
              >
                {isCheckingForUpdates ? 'Checking for updates...' : 'Check for update'}
              </button>
              <button type="button" className="modal__button" onClick={onExportDiagnostics}>
                Export diagnostics
              </button>
              <button type="button" className="modal__button modal__button--primary" onClick={() => setIsAboutOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AppModals
