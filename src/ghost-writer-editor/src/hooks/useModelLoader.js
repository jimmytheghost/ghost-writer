import { useCallback, useEffect, useRef, useState } from 'react'
import { isDesktopRuntime, loadDesktopOllamaModels } from '../lib/desktopRuntime'

function normalizeModels(models) {
  if (!Array.isArray(models)) return []

  const seen = new Set()
  const normalized = []
  for (const model of models) {
    const value = typeof model === 'string' ? model.trim() : ''
    if (!value || seen.has(value)) continue
    seen.add(value)
    normalized.push(value)
  }
  return normalized
}

export function useModelLoader({ bundledModels = [], modelSnapshotTimeoutMs = 2000 }) {
  const desktopRuntime = isDesktopRuntime()
  const cachedModels = normalizeModels(bundledModels)
  const [models, setModels] = useState(desktopRuntime ? [] : cachedModels)
  const [selectedModel, setSelectedModel] = useState(desktopRuntime ? '' : cachedModels[0] ?? '')
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [modelLoadStatus, setModelLoadStatus] = useState(
    desktopRuntime
      ? 'Loading Ollama models...'
      : cachedModels.length
      ? `Loaded ${cachedModels.length} cached model(s). Refreshing from Ollama on launch.`
      : 'Loading Ollama models...',
  )
  const isMountedRef = useRef(true)
  const hasAttemptedInitialLoadRef = useRef(false)

  useEffect(
    () => () => {
      isMountedRef.current = false
    },
    [],
  )

  const loadModels = useCallback(async ({ force = false } = {}) => {
    if (isLoadingModels) return
    if (!force && models.length > 0) return

    setIsLoadingModels(true)
    setModelLoadStatus('Loading models...')

    try {
      if (desktopRuntime) {
        const result = await loadDesktopOllamaModels()
        if (!result.ok) {
          throw new Error(result.error ?? 'Unable to load Ollama models.')
        }

        const liveModels = normalizeModels(result.models)

        if (isMountedRef.current) {
          setModels(liveModels)
          setSelectedModel((current) => (liveModels.includes(current) ? current : liveModels[0] ?? ''))
          setModelLoadStatus(
            liveModels.length > 0
              ? `Loaded ${liveModels.length} model(s) from Ollama.`
              : 'No Ollama models installed yet.',
          )
        }
        return
      }

      const snapshotResult = await Promise.race([
        fetch(`/ollama-models.json?t=${Date.now()}`, { cache: 'no-store' })
          .then(async (response) => {
            if (!response.ok) return null
            return response.json()
          })
          .catch(() => null),
        new Promise((resolve) => setTimeout(() => resolve(null), modelSnapshotTimeoutMs)),
      ])

      const snapshotModels = normalizeModels(snapshotResult?.models)

      if (snapshotModels.length > 0) {
        if (isMountedRef.current) {
          setModels(snapshotModels)
          setSelectedModel((current) => (snapshotModels.includes(current) ? current : snapshotModels[0]))
          setModelLoadStatus(`Loaded ${snapshotModels.length} model(s) from cached snapshot.`)
        }
        return
      }

      throw new Error('Snapshot did not include any models. Run `npm run sync:models`.')
    } catch (error) {
      const failureMessage = error?.message ?? 'Unable to load Ollama models.'
      if (isMountedRef.current) {
        if (desktopRuntime) {
          setModels([])
          setSelectedModel('')
          setModelLoadStatus(`Model load failed: ${failureMessage}`)
        } else {
          if (cachedModels.length > 0) {
            setModels(cachedModels)
            setSelectedModel((current) => (cachedModels.includes(current) ? current : cachedModels[0] ?? ''))
            setModelLoadStatus(`Using cached models. Live refresh failed: ${failureMessage}`)
          } else {
            setModels([])
            setSelectedModel('')
            setModelLoadStatus(`Model load failed: ${failureMessage}`)
          }
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingModels(false)
      }
    }
  }, [cachedModels, desktopRuntime, isLoadingModels, modelSnapshotTimeoutMs, models.length])

  useEffect(() => {
    if (hasAttemptedInitialLoadRef.current) return
    hasAttemptedInitialLoadRef.current = true
    void loadModels({ force: desktopRuntime })
  }, [desktopRuntime, loadModels])

  return {
    isLoadingModels,
    loadModels,
    modelLoadStatus,
    models,
    selectedModel,
    setSelectedModel,
  }
}
