"use client"

import { type RefObject, useEffect, useRef, useState } from "react"
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.js"

export interface Presence<T extends HTMLElement> {
  ref: RefObject<T | null>
  /** Render the element while this is true: it stays true through the exit animation. */
  present: boolean
  /** Put on the element as `data-state` so CSS can choose the enter or exit animation. */
  state: "open" | "closed"
}

/** Keeps an element mounted until every CSS animation it runs after closing has finished. */
export const usePresence = <T extends HTMLElement = HTMLElement>(
  open: boolean,
): Presence<T> => {
  const ref = useRef<T | null>(null)
  const [mounted, setMounted] = useState(open)

  useIsomorphicLayoutEffect(() => {
    if (open) setMounted(true)
  }, [open])

  useEffect(() => {
    if (open || !mounted) return
    const node = ref.current
    // Infinite loops (spinners, shimmer) never finish, so waiting on them would never unmount.
    const animations = (node?.getAnimations?.({ subtree: true }) ?? []).filter(
      (animation) =>
        animation.effect?.getTiming().iterations !== Number.POSITIVE_INFINITY,
    )
    if (animations.length === 0) {
      setMounted(false)
      return
    }
    let cancelled = false
    void Promise.allSettled(animations.map((animation) => animation.finished)).then(
      () => {
        if (!cancelled) setMounted(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [open, mounted])

  return { ref, present: open || mounted, state: open ? "open" : "closed" }
}
