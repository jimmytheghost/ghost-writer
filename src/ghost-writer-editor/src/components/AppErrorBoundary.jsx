import { Component } from 'react'
import './AppErrorBoundary.css'

function buildDiagnosticsText(error, errorInfo) {
  const name = error?.name || 'Error'
  const message = error?.message || 'Unknown render error'
  const stack = error?.stack || 'No stack available'
  const componentStack = errorInfo?.componentStack || 'No component stack available'

  return [
    'Ghost Writer crash diagnostics',
    `Timestamp: ${new Date().toISOString()}`,
    `Name: ${name}`,
    `Message: ${message}`,
    '',
    'Stack:',
    stack,
    '',
    'Component stack:',
    componentStack,
  ].join('\n')
}

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copyStatus: '',
    }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      copyStatus: '',
    }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    })
  }

  handleCopyDiagnostics = async () => {
    const diagnostics = buildDiagnosticsText(this.state.error, this.state.errorInfo)
    try {
      if (!navigator?.clipboard?.writeText) {
        this.setState({ copyStatus: 'Clipboard API is unavailable in this runtime.' })
        return
      }
      await navigator.clipboard.writeText(diagnostics)
      this.setState({ copyStatus: 'Diagnostics copied to clipboard.' })
    } catch {
      this.setState({ copyStatus: 'Failed to copy diagnostics.' })
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="app-error-boundary" role="alert">
        <div className="app-error-boundary__panel">
          <h1>Ghost Writer hit an unexpected error</h1>
          <p>The current view crashed. You can copy diagnostics and reload the app.</p>
          <div className="app-error-boundary__actions">
            <button type="button" onClick={this.handleCopyDiagnostics}>
              Copy diagnostics
            </button>
            <button type="button" onClick={this.handleReload}>
              Reload app
            </button>
          </div>
          {this.state.copyStatus ? (
            <p className="app-error-boundary__status" role="status">
              {this.state.copyStatus}
            </p>
          ) : null}
        </div>
      </div>
    )
  }
}

export default AppErrorBoundary
