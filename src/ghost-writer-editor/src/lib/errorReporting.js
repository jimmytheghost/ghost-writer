/**
 * Central error reporting for user-visible feedback.
 * Normalizes thrown values to safe, short messages and forwards them
 * to a UI reporter (e.g. prompt error area) when set.
 */

const MAX_MESSAGE_LENGTH = 200

/**
 * Turn an unknown thrown value into a short, safe user message.
 * Avoids exposing stack traces or PII.
 * @param {unknown} error - Thrown value (Error, string, etc.)
 * @param {string} fallback - Message when error is empty or not useful
 * @returns {string}
 */
export function toUserMessage(error, fallback = 'Something went wrong.') {
  if (error == null) return fallback
  if (typeof error === 'string') {
    const trimmed = error.trim()
    return trimmed.length ? trimmed.slice(0, MAX_MESSAGE_LENGTH) : fallback
  }
  if (error instanceof Error && error.message) {
    return error.message.trim().slice(0, MAX_MESSAGE_LENGTH) || fallback
  }
  try {
    const s = String(error)
    return s.trim().slice(0, MAX_MESSAGE_LENGTH) || fallback
  } catch {
    return fallback
  }
}

let reportFn = null

/**
 * Set the function to call when an error should be shown to the user.
 * Typically (message) => setPromptError(message).
 * @param {(message: string) => void} fn
 */
export function setReportFn(fn) {
  reportFn = typeof fn === 'function' ? fn : null
}

/**
 * Report an error to the user via the registered reporter.
 * Call this from catch blocks instead of only console.warn.
 * @param {unknown} error - Thrown value
 * @param {string} contextFallback - Fallback message if error has no message (e.g. "Save failed")
 */
export function report(error, contextFallback) {
  const message = toUserMessage(error, contextFallback)
  if (typeof reportFn === 'function') {
    try {
      reportFn(message)
    } catch {
      // Avoid breaking the app if the reporter throws
    }
  }
}
