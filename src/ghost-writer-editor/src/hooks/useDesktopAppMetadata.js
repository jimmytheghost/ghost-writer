import { useEffect } from 'react'
import { getName, getVersion } from '@tauri-apps/api/app'
import { isDesktopRuntime } from '../lib/desktopRuntime'

export function useDesktopAppMetadata({ setAppName, setAppVersion }) {
  useEffect(() => {
    if (!isDesktopRuntime()) return

    const loadAppMetadata = async () => {
      try {
        const [name, version] = await Promise.all([getName(), getVersion()])
        setAppName(name)
        setAppVersion(version)
      } catch {
        // Keep defaults when metadata is unavailable.
      }
    }

    void loadAppMetadata()
  }, [setAppName, setAppVersion])
}
