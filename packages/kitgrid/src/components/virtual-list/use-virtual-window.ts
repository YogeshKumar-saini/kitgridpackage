"use client"

import { type RefObject, useCallback, useEffect, useState } from "react"

export interface VirtualWindow {
  start: number
  end: number
  /** Pixels above the first rendered item. */
  offset: number
  /** Full scroll height of all items. */
  total: number
}

/**
 * Fixed-row windowing: only the rows in view, plus `overscan` either side, are rendered.
 * State changes only when the visible range changes, not on every scroll event.
 */
export const useVirtualWindow = (
  ref: RefObject<HTMLElement | null>,
  count: number,
  itemHeight: number,
  overscan: number,
  /** Used before the container has been measured (SSR and first paint). */
  initialHeight: number,
): VirtualWindow => {
  const compute = useCallback(
    (scrollTop: number, viewport: number): VirtualWindow => {
      const first = Math.floor(scrollTop / itemHeight)
      const visible = Math.ceil(viewport / itemHeight)
      const start = Math.max(0, first - overscan)
      const end = Math.min(count, first + visible + overscan)
      return { start, end, offset: start * itemHeight, total: count * itemHeight }
    },
    [count, itemHeight, overscan],
  )

  const [range, setRange] = useState<VirtualWindow>(() => compute(0, initialHeight))

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const update = () => {
      const next = compute(node.scrollTop, node.clientHeight || initialHeight)
      setRange((current) =>
        current.start === next.start && current.end === next.end && current.total === next.total
          ? current
          : next,
      )
    }
    update()
    node.addEventListener("scroll", update, { passive: true })
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update)
    observer?.observe(node)
    return () => {
      node.removeEventListener("scroll", update)
      observer?.disconnect()
    }
  }, [ref, compute, initialHeight])

  return range
}
