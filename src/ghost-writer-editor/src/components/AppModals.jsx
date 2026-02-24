function AppModals({
  isSaveOpen,
  setIsSaveOpen,
  fileName,
  setFileName,
  handleSaveConfirm,
  isAboutOpen,
  setIsAboutOpen,
  appName,
  appVersion,
}) {
  return (
    <>
      {isSaveOpen && (
        <div className="modal-overlay" onClick={() => setIsSaveOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2 className="modal__title">Save markdown file</h2>
            <p className="modal__description">Choose a file name for your document.</p>
            <label className="modal__label" htmlFor="fileName">
              File name
            </label>
            <input
              id="fileName"
              className="modal__input"
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              placeholder="ghost-writer-document.md"
            />
            <div className="modal__actions">
              <button type="button" className="modal__button" onClick={() => setIsSaveOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="modal__button modal__button--primary"
                onClick={handleSaveConfirm}
                disabled={!fileName.trim()}
              >
                Save
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
