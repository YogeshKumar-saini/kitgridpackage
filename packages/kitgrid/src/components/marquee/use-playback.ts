"use client"

import { type RefObject, useSyncExternalStore } from "react"
import { useInView } from "../../hooks/use-in-view.js"

const subscribe = (notify: () => void) => {
  document.addEventListener("visibilitychange", notify)
  return () => document.removeEventListener("visibilitychange", notify)
}

/**
 * True while an effect is worth running: its element is on screen and the page is visible.
 * Shared by the looping motion components in this group.
 */
export const usePlayback = (ref: RefObject<Element | null>): boolean => {
  const inView = useInView(ref, { once: false, amount: 0 })
  const visible = useSyncExternalStore(
    subscribe,
    () => !document.hidden,
    () => true,
  )
  return inView && visible
}
