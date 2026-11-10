"use client"

import { type RefObject, useEffect } from "react"
import { useEventCallback } from "./use-event-callback.js"

export type DismissReason = "escape" | "outside"

export interface DismissOptions {
  enabled: boolean
  onDismiss: (reason: DismissReason) => void
  /** Elements that count as "inside": the layer itself and usually its trigger. */
  refs: RefObject<HTMLElement | null>[]
  escape?: boolean
  outside?: boolean
}

// Only the most recently opened layer answers Escape, so nested popovers close one at a time.
const layers: symbol[] = []

export const useDismiss = ({
  enabled,
  onDismiss,
  refs,
  escape = true,
  outside = true,
}: DismissOptions): void => {
  const dismiss = useEventCallback(onDismiss)
  const isInside = useEventCallback((target: Node) =>
    refs.some((ref) => ref.current?.contains(target)),
  )

  useEffect(() => {
    if (!enabled) return
    const id = Symbol("layer")
    layers.push(id)

    const handleKey = (event: KeyboardEvent) => {
      if (!escape || event.key !== "Escape" || layers.at(-1) !== id) return
      event.preventDefault()
      dismiss("escape")
    }
    const handlePointer = (event: PointerEvent) => {
      if (!outside) return
      const target = event.target as Node | null
      if (target && isInside(target)) return
      dismiss("outside")
    }

    document.addEventListener("keydown", handleKey)
    document.addEventListener("pointerdown", handlePointer, true)
    return () => {
      layers.splice(layers.indexOf(id), 1)
      document.removeEventListener("keydown", handleKey)
      document.removeEventListener("pointerdown", handlePointer, true)
    }
  }, [enabled, escape, outside, dismiss, isInside])
}
