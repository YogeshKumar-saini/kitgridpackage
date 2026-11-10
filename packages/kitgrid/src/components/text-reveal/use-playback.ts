"use client"

import { type RefObject, useEffect, useState } from "react"
import { useInView } from "../../hooks/use-in-view.js"

/** True while the element is on screen and the tab is visible, so looping text effects idle otherwise. */
export const usePlayback = (
  ref: RefObject<Element | null>,
  enabled = true,
): boolean => {
  const inView = useInView(ref, { once: false, amount: 0 })
  const [pageVisible, setPageVisible] = useState(true)

  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState !== "hidden")
    update()
    document.addEventListener("visibilitychange", update)
    return () => document.removeEventListener("visibilitychange", update)
  }, [])

  return enabled && inView && pageVisible
}
