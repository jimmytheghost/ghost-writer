function AppModals({
  isAboutOpen,
  setIsAboutOpen,
  isSettingsOpen,
  setIsSettingsOpen,
  settings,
  updateSetting,
  models,
  appName,
  appVersion,
}) {
  return (
    <>
      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal modal--settings" onClick={(event) => event.stopPropagation()}>
            <h2 className="modal__title">Settings</h2>
            <p className="modal__description">Defaults are applied instantly and saved for next launch.</p>

            <label className="modal__label" htmlFor="settings-model">
              Default model
            </label>
            <select
              id="settings-model"
              className="modal__input modal__select"
              value={settings.defaultModel}
              onChange={(event) => updateSetting('defaultModel', event.target.value)}
            >
              <option value="">Use current model</option>
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>

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

            <div className="modal__actions">
              <button type="button" className="modal__button modal__button--primary" onClick={() => setIsSettingsOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {isAboutOpen && (
        <div className="modal-overlay" onClick={() => setIsAboutOpen(false)}>
          <div className="modal about-modal" onClick={(event) => event.stopPropagation()}>
            <div className="about-modal__header">
              <img
                className="about-modal__logo"
                src="/ghost-writer-logo.png"
                alt={`${appName} logo`}
                width="64"
                height="64"
              />
              <div className="about-modal__title-block">
                <h2 className="modal__title about-modal__app-name">{appName}</h2>
                <div className="about-modal__meta">Version {appVersion}</div>
                <div className="about-modal__meta">Vibe Coded by Jimmy Weber</div>
              </div>
            </div>
            <hr className="about-modal__divider" />
            <div className="about-modal__body">
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
            </div>
            <div className="modal__actions">
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
