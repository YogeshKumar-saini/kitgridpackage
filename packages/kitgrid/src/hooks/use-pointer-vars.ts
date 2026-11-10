"use client"

import { type RefObject, useEffect } from "react"
import { useEventCallback } from "./use-event-callback.js"

export interface PointerSample {
  /** Pixels from the element's top-left corner. */
  x: number
  y: number
  /** 0–1 across the element's width and height. */
  u: number
  v: number
  rect: DOMRect
}

export interface PointerVarsOptions {
  enabled?: boolean
  onMove?: (sample: PointerSample) => void
  onLeave?: () => void
}

/**
 * Writes `--kg-pointer-x/y` (px) and `--kg-pointer-u/v` (0–1) onto the element at most once
 * per frame, and toggles `data-pointer="in"`, so CSS can follow the cursor without re-renders.
 */
export const usePointerVars = (
  ref: RefObject<HTMLElement | null>,
  { enabled = true, onMove, onLeave }: PointerVarsOptions = {},
): void => {
  const move = useEventCallback(onMove)
  const leave = useEventCallback(onLeave)

  useEffect(() => {
    const node = ref.current
    if (!node || !enabled) return
    let frame = 0
    let last: PointerEvent | null = null

    const flush = () => {
      frame = 0
      if (!last) return
      const rect = node.getBoundingClientRect()
      const x = last.clientX - rect.left
      const y = last.clientY - rect.top
      const u = rect.width ? x / rect.width : 0
      const v = rect.height ? y / rect.height : 0
      node.style.setProperty("--kg-pointer-x", `${x}px`)
      node.style.setProperty("--kg-pointer-y", `${y}px`)
      node.style.setProperty("--kg-pointer-u", u.toFixed(4))
      node.style.setProperty("--kg-pointer-v", v.toFixed(4))
      move({ x, y, u, v, rect })
    }

    const handleMove = (event: PointerEvent) => {
      last = event
      if (!frame) frame = requestAnimationFrame(flush)
    }
    const handleEnter = () => {
      node.dataset.pointer = "in"
    }
    const handleLeave = () => {
      delete node.dataset.pointer
      leave()
    }

    node.addEventListener("pointermove", handleMove, { passive: true })
    node.addEventListener("pointerenter", handleEnter)
    node.addEventListener("pointerleave", handleLeave)
    return () => {
      cancelAnimationFrame(frame)
      node.removeEventListener("pointermove", handleMove)
      node.removeEventListener("pointerenter", handleEnter)
      node.removeEventListener("pointerleave", handleLeave)
    }
  }, [ref, enabled, move, leave])
}
