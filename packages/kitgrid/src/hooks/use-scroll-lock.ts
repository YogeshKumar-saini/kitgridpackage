"use client"

import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.js"

// Reference-counted so stacked modals unlock only when the last one closes.
let locks = 0
let restore: (() => void) | null = null

export const useScrollLock = (locked: boolean): void => {
  useIsomorphicLayoutEffect(() => {
    if (!locked) return
    if (locks++ === 0) {
      const root = document.documentElement
      const gutter = window.innerWidth - root.clientWidth
      const previous = {
        overflow: root.style.overflow,
        paddingRight: root.style.paddingRight,
      }
      root.style.overflow = "hidden"
      if (gutter > 0) root.style.paddingRight = `${gutter}px`
      restore = () => {
        root.style.overflow = previous.overflow
        root.style.paddingRight = previous.paddingRight
      }
    }
    return () => {
      if (--locks === 0) {
        restore?.()
        restore = null
      }
    }
  }, [locked])
}
