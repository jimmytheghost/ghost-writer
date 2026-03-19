import ModelDropdown from './ModelDropdown'

function FooterBar({
  footerRef,
  isFooterCollapsed,
  setIsFooterCollapsed,
  handleNew,
  handleSaveClick,
  handleLoadClick,
  handleCopyClick,
  isPreviewOpen,
  handleTogglePreview,
  modKeyLabel,
  selectedModel,
  setSelectedModel,
  models,
  loadModels,
  modelLoadStatus,
  footerActionFeedback,
  isDark,
  onToggleTheme,
  isAlwaysOnTop,
  handleAlwaysOnTopToggle,
}) {
  const activeFooterAction = footerActionFeedback?.action ?? ''
  const footerFeedbackMessage = footerActionFeedback?.message ?? ''

  function getActionButtonClass(action) {
    return `doc-actions__button${activeFooterAction === action ? ' doc-actions__button--feedback' : ''}`
  }

  return (
    <footer
      ref={footerRef}
      className={`app__footer${isFooterCollapsed ? ' app__footer--collapsed' : ''}`}
      onClick={isFooterCollapsed ? () => setIsFooterCollapsed(false) : undefined}
      onKeyDown={
        isFooterCollapsed
          ? (event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              event.preventDefault()
              setIsFooterCollapsed(false)
            }
          : undefined
      }
      role={isFooterCollapsed ? 'button' : undefined}
      tabIndex={isFooterCollapsed ? 0 : undefined}
      aria-label={isFooterCollapsed ? 'Expand footer controls' : undefined}
    >
      <div className="app__footer-row">
        {!isFooterCollapsed && (
          <div className="doc-actions">
            <button
              type="button"
              className={getActionButtonClass('new')}
              onClick={handleNew}
              aria-label="New document"
              title={`New (${modKeyLabel}+N)`}
            >
              <span className="material-symbols-rounded" aria-hidden="true">
                note_add
              </span>
            </button>
            <button
              type="button"
              className={getActionButtonClass('save')}
              onClick={handleSaveClick}
              aria-label="Save document"
              title={`Save (${modKeyLabel}+S)`}
            >
              <span className="material-symbols-rounded" aria-hidden="true">
                save
              </span>
            </button>
            <button
              type="button"
              className={getActionButtonClass('load')}
              onClick={handleLoadClick}
              aria-label="Load document"
              title={`Open (${modKeyLabel}+O)`}
            >
              <span className="material-symbols-rounded" aria-hidden="true">
                upload_file
              </span>
            </button>
            <button
              type="button"
              className={getActionButtonClass('copy')}
              onClick={handleCopyClick}
              aria-label="Copy to clipboard"
            >
              <span className="material-symbols-rounded" aria-hidden="true">
                content_copy
              </span>
            </button>
            <button
              type="button"
              className={`doc-actions__button${isPreviewOpen ? ' doc-actions__button--active' : ''}`}
              onClick={handleTogglePreview}
              aria-label={isPreviewOpen ? 'Exit markdown preview' : 'Toggle markdown preview'}
              aria-pressed={isPreviewOpen}
              title={isPreviewOpen ? `Exit preview (${modKeyLabel}+M)` : `Preview (${modKeyLabel}+M)`}
            >
              <span className="material-symbols-rounded" aria-hidden="true">
                {isPreviewOpen ? 'close' : 'preview'}
              </span>
            </button>
            {footerFeedbackMessage ? (
              <div className="doc-actions__status" role="status" aria-live="polite">
                {footerFeedbackMessage}
              </div>
            ) : null}
          </div>
        )}
        {!isFooterCollapsed && (
          <div className="footer-controls">
            <div className="footer-model">
              <ModelDropdown
                id="modelSelect"
                ariaLabel="Ollama model"
                title={selectedModel || 'No models available'}
                value={selectedModel}
                options={models}
                onChange={setSelectedModel}
                onOpen={() => {
                  if (!models.length) {
                    void loadModels()
                  }
                }}
                emptyStateLabel="No models available"
                placement="top"
                align="end"
              />
              {models.length === 0 && (
                <div className="footer-model__status">{modelLoadStatus}</div>
              )}
            </div>
            <button
              type="button"
              className="theme-toggle"
              aria-pressed={isDark}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={onToggleTheme}
            >
              <span className="material-symbols-rounded" aria-hidden="true">
                {isDark ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <button
              type="button"
              className={`footer-pin${isAlwaysOnTop ? ' doc-actions__button--active' : ''}`}
              aria-pressed={isAlwaysOnTop}
              aria-label="Toggle always on top"
              title={`Always on top (${modKeyLabel}+T)`}
              onClick={handleAlwaysOnTopToggle}
            >
              <span className="material-symbols-rounded" aria-hidden="true">
                push_pin
              </span>
            </button>
            <span className="footer-controls__divider" aria-hidden="true">
              |
            </span>
            <button
              type="button"
              className="footer-collapse"
              aria-expanded={!isFooterCollapsed}
              aria-label="Collapse footer"
              onClick={() => setIsFooterCollapsed(true)}
            >
              <span className="material-symbols-rounded" aria-hidden="true">
                keyboard_arrow_down
              </span>
            </button>
          </div>
        )}
      </div>
    </footer>
  )
}

export default FooterBar
