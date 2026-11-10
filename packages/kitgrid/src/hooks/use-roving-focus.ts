"use client"

import { type KeyboardEvent, useCallback } from "react"

export interface RovingFocusOptions {
  orientation?: "horizontal" | "vertical" | "both"
  loop?: boolean
  /** Items are found by this selector inside the element that receives the handler. */
  selector?: string
}

export const ROVING_ITEM_SELECTOR =
  '[data-kg-item]:not([disabled]):not([aria-disabled="true"])'

/**
 * Returns an onKeyDown handler for a composite widget (tabs, radio group, toolbar, menu) that
 * moves focus between items with the arrow keys, Home and End, mirroring arrows in RTL.
 * The newly focused item is returned so callers can select on focus.
 */
export const useRovingFocus = ({
  orientation = "horizontal",
  loop = true,
  selector = ROVING_ITEM_SELECTOR,
}: RovingFocusOptions = {}) =>
  useCallback(
    (event: KeyboardEvent<HTMLElement>): HTMLElement | undefined => {
      const container = event.currentTarget
      const rtl = getComputedStyle(container).direction === "rtl"
      const deltas: Record<string, number> = {}
      if (orientation !== "vertical") {
        deltas.ArrowRight = rtl ? -1 : 1
        deltas.ArrowLeft = rtl ? 1 : -1
      }
      if (orientation !== "horizontal") {
        deltas.ArrowDown = 1
        deltas.ArrowUp = -1
      }

      const items = Array.from(container.querySelectorAll<HTMLElement>(selector))
      if (items.length === 0) return
      const current = items.indexOf(document.activeElement as HTMLElement)
      let next: number

      if (event.key === "Home") next = 0
      else if (event.key === "End") next = items.length - 1
      else if (event.key in deltas) {
        const delta = deltas[event.key] as number
        if (current === -1) next = delta > 0 ? 0 : items.length - 1
        else if (loop) next = (current + delta + items.length) % items.length
        else next = Math.min(Math.max(current + delta, 0), items.length - 1)
      } else return

      event.preventDefault()
      const item = items[next]
      item?.focus()
      return item
    },
    [orientation, loop, selector],
  )
