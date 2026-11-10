"use client"

import { useSyncExternalStore } from "react"

/** What server renders and hydration agree on before the browser's own locale is known. */
export const SERVER_LOCALE = "en-US"

const subscribe = (notify: () => void) => {
  window.addEventListener("languagechange", notify)
  return () => window.removeEventListener("languagechange", notify)
}

/**
 * The locale to format with: the explicit one when given, otherwise the browser's. Server
 * render and hydration both use SERVER_LOCALE so their text matches; the browser locale takes
 * over right after hydration.
 */
export const useLocale = (locale?: string): string => {
  const detected = useSyncExternalStore(
    subscribe,
    () => navigator.language,
    () => SERVER_LOCALE,
  )
  return locale ?? detected
}
