import { useEffect } from 'react'

export function useFooterHeightSync(appRef, footerRef, dependencyKey = '') {
  useEffect(() => {
    if (!appRef.current || !footerRef.current) return undefined

    const appElement = appRef.current
    const footerElement = footerRef.current

    const syncFooterHeight = () => {
      appElement.style.setProperty('--app-footer-height', `${footerElement.offsetHeight}px`)
    }

    syncFooterHeight()

    const canObserveResize = typeof ResizeObserver !== 'undefined'
    const resizeObserver = canObserveResize ? new ResizeObserver(syncFooterHeight) : null
    resizeObserver?.observe(footerElement)
    window.addEventListener('resize', syncFooterHeight)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', syncFooterHeight)
    }
  }, [appRef, dependencyKey, footerRef])
}
