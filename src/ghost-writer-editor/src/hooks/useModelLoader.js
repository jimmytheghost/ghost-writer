import { useCallback, useEffect, useRef, useState } from 'react'

export function useModelLoader({ bundledModels = [], modelSnapshotTimeoutMs = 2000 }) {
  const [models, setModels] = useState(bundledModels)
  const [selectedModel, setSelectedModel] = useState(bundledModels[0] ?? '')
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [modelLoadStatus, setModelLoadStatus] = useState(
    bundledModels.length
      ? `Loaded ${bundledModels.length} model(s) from bundled snapshot.`
      : 'No bundled model snapshot found. Run `npm run sync:models` and relaunch.',
  )
  const isMountedRef = useRef(true)

  useEffect(
    () => () => {
      isMountedRef.current = false
    },
    [],
  )

  const loadModels = useCallback(async () => {
    if (isLoadingModels || models.length > 0) return

    setIsLoadingModels(true)
    setModelLoadStatus('Loading models...')

    try {
      const snapshotResult = await Promise.race([
        fetch(`/ollama-models.json?t=${Date.now()}`, { cache: 'no-store' })
          .then(async (response) => {
            if (!response.ok) return null
            return response.json()
          })
          .catch(() => null),
        new Promise((resolve) => setTimeout(() => resolve(null), modelSnapshotTimeoutMs)),
      ])

      const snapshotModels = Array.isArray(snapshotResult?.models)
        ? snapshotResult.models.filter(Boolean)
        : []

      if (snapshotModels.length > 0) {
        if (isMountedRef.current) {
          setModels(snapshotModels)
          setSelectedModel((current) => (snapshotModels.includes(current) ? current : snapshotModels[0]))
          setModelLoadStatus(`Loaded ${snapshotModels.length} model(s) from snapshot.`)
        }
        return
      }

      throw new Error('Snapshot did not include any models. Run `npm run sync:models`.')
    } catch (error) {
      const failureMessage = error?.message ?? 'Unable to load Ollama models.'
      if (isMountedRef.current) {
        if (models.length > 0) {
          setModelLoadStatus(`Using bundled models. Latest refresh failed: ${failureMessage}`)
        } else {
          setSelectedModel('')
          setModelLoadStatus(`Model load failed: ${failureMessage}`)
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingModels(false)
      }
    }
  }, [isLoadingModels, modelSnapshotTimeoutMs, models.length])

  useEffect(() => {
    if (!models.length) {
      void loadModels()
    }
  }, [loadModels, models.length])

  return {
    isLoadingModels,
    loadModels,
    modelLoadStatus,
    models,
    selectedModel,
    setSelectedModel,
  }
}
