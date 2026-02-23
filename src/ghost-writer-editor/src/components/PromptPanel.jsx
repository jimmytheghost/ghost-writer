function PromptPanel({
  isDark,
  promptFormRef,
  handlePromptSubmit,
  promptText,
  setPromptText,
  handlePromptKeyDown,
  setIsPromptFocused,
  showStoppedToast,
  isLoadingPrompt,
  selectedModel,
  handlePrimaryPromptAction,
  handleUndoToggle,
  canUndoGeneration,
  canRedoGeneration,
  undoToggleState,
  handleClearPrompt,
  promptError,
}) {
  return (
    <section className={`prompt-panel${isDark ? ' prompt-panel--dark' : ''}`}>
      <form ref={promptFormRef} className="prompt-panel__form" onSubmit={handlePromptSubmit}>
        <div className="prompt-panel__row">
          <input
            id="promptText"
            className="prompt-panel__input"
            type="text"
            aria-label="Prompt input"
            value={promptText}
            onChange={(event) => setPromptText(event.target.value)}
            onKeyDown={handlePromptKeyDown}
            onFocus={() => setIsPromptFocused(true)}
            onBlur={() => setIsPromptFocused(false)}
            placeholder=""
          />
          <div className="prompt-panel__actions">
            {showStoppedToast && (
              <div className="prompt-panel__stopped-toast" aria-live="polite">
                Stopped
              </div>
            )}
            <button
              type="button"
              className={`prompt-panel__button prompt-panel__button--primary${
                isLoadingPrompt ? ' prompt-panel__button--busy' : ''
              }`}
              disabled={!isLoadingPrompt && (!promptText.trim() || !selectedModel.trim())}
              aria-label={isLoadingPrompt ? 'Stop generation' : 'Send prompt'}
              title={isLoadingPrompt ? 'Stop' : 'Send'}
              onClick={handlePrimaryPromptAction}
            >
              {isLoadingPrompt ? (
                <span className="prompt-panel__button-content" aria-label="Generating">
                  <span className="prompt-panel__spinner" />
                  <span className="material-symbols-rounded" aria-hidden="true">
                    stop
                  </span>
                </span>
              ) : (
                <span className="material-symbols-rounded" aria-hidden="true">
                  send
                </span>
              )}
            </button>
            <button
              type="button"
              className="prompt-panel__button"
              onClick={handleUndoToggle}
              disabled={!canUndoGeneration && !canRedoGeneration}
              aria-label={undoToggleState === 'redo' ? 'Redo generation' : 'Undo generation'}
              title={undoToggleState === 'redo' ? 'Redo' : 'Undo'}
            >
              <span className="material-symbols-rounded" aria-hidden="true">
                {undoToggleState === 'redo' ? 'redo' : 'undo'}
              </span>
            </button>
            <button
              type="button"
              className="prompt-panel__button"
              onClick={handleClearPrompt}
              aria-label="Clear prompt"
              title="Clear"
            >
              <span className="material-symbols-rounded" aria-hidden="true">
                clear_all
              </span>
            </button>
          </div>
        </div>
        {promptError && (
          <div
            className={`prompt-panel__status ${
              promptError === 'Generation stopped.' ? 'prompt-panel__status--stopped' : 'prompt-panel__status--error'
            }`}
          >
            {promptError}
          </div>
        )}
      </form>
    </section>
  )
}

export default PromptPanel
