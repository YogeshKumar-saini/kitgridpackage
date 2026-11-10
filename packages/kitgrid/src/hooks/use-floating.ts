"use client"

import type { RefObject } from "react"
import { clamp } from "../utils/math.js"
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.js"

export type Side = "top" | "right" | "bottom" | "left"
export type Align = "start" | "center" | "end"

export interface FloatingOptions {
  open: boolean
  side?: Side
  align?: Align
  /** Gap between anchor and layer, in px. */
  offset?: number
  /** Minimum distance kept from the viewport edge, in px. */
  padding?: number
  /** Move to the opposite side when the preferred side lacks room. */
  flip?: boolean
  /** Make the layer at least as wide as the anchor. */
  matchWidth?: boolean
}

const opposite: Record<Side, Side> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
}

/**
 * Positions a `position: fixed` layer next to its anchor and keeps it there through scroll and
 * resize. Writes `data-side`, `--kg-origin` (for scale-from-anchor animations) and
 * `--kg-anchor-width` directly on the layer, so it never triggers a React render.
 */
export const useFloating = (
  anchorRef: RefObject<HTMLElement | null>,
  floatingRef: RefObject<HTMLElement | null>,
  {
    open,
    side = "bottom",
    align = "center",
    offset = 8,
    padding = 8,
    flip = true,
    matchWidth = false,
  }: FloatingOptions,
): void => {
  useIsomorphicLayoutEffect(() => {
    const anchor = anchorRef.current
    const floating = floatingRef.current
    if (!open || !anchor || !floating) return
    let frame = 0

    const update = () => {
      const a = anchor.getBoundingClientRect()
      floating.style.setProperty("--kg-anchor-width", `${a.width}px`)
      if (matchWidth) floating.style.minWidth = `${a.width}px`
      // offset* ignores the entry transform, so the scale-in animation can't skew the measurement.
      const width = floating.offsetWidth
      const height = floating.offsetHeight
      const vw = document.documentElement.clientWidth
      const vh = window.innerHeight

      let resolved = side
      if (flip) {
        const room = {
          top: a.top,
          bottom: vh - a.bottom,
          left: a.left,
          right: vw - a.right,
        }
        const vertical = side === "top" || side === "bottom"
        const needed = (vertical ? height : width) + offset + padding
        if (room[side] < needed && room[opposite[side]] > room[side])
          resolved = opposite[side]
      }

      const vertical = resolved === "top" || resolved === "bottom"
      let x: number
      let y: number
      if (vertical) {
        y = resolved === "bottom" ? a.bottom + offset : a.top - offset - height
        x =
          align === "start"
            ? a.left
            : align === "end"
              ? a.right - width
              : a.left + a.width / 2 - width / 2
      } else {
        x = resolved === "right" ? a.right + offset : a.left - offset - width
        y =
          align === "start"
            ? a.top
            : align === "end"
              ? a.bottom - height
              : a.top + a.height / 2 - height / 2
      }
      x = clamp(x, padding, Math.max(padding, vw - width - padding))
      y = clamp(y, padding, Math.max(padding, vh - height - padding))

      floating.style.left = `${Math.round(x)}px`
      floating.style.top = `${Math.round(y)}px`
      floating.dataset.side = resolved

      const originX = clamp(a.left + a.width / 2 - x, 0, width)
      const originY = clamp(a.top + a.height / 2 - y, 0, height)
      floating.style.setProperty(
        "--kg-origin",
        vertical
          ? `${originX}px ${resolved === "bottom" ? 0 : height}px`
          : `${resolved === "right" ? 0 : width}px ${originY}px`,
      )
    }

    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }

    update()
    const observer = new ResizeObserver(schedule)
    observer.observe(anchor)
    observer.observe(floating)
    window.addEventListener("scroll", schedule, { capture: true, passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener("scroll", schedule, { capture: true })
      window.removeEventListener("resize", schedule)
    }
  }, [open, side, align, offset, padding, flip, matchWidth, anchorRef, floatingRef])
}
