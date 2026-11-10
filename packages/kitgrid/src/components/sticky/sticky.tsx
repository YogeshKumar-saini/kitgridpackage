"use client"

import { type ElementType, forwardRef, type HTMLAttributes, useEffect, useRef } from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { type BoxSpace, space, vars } from "../box/space.js"

export interface StickyProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  /** The edge it sticks to. */
  edge?: "top" | "bottom"
  /** Distance from that edge while stuck. */
  offset?: BoxSpace
  /** Called when it starts or stops sticking. `data-stuck` is set on the element either way. */
  onStuckChange?: (stuck: boolean) => void
}

/**
 * Sticks to an edge of its scroll container and reports when it is stuck, so a header can gain
 * a surface and shadow only once content scrolls beneath it.
 */
export const Sticky = forwardRef<HTMLElement, StickyProps>(
  (
    { as: Tag = "div", edge = "top", offset = 0, onStuckChange, className, style, ...props },
    ref,
  ) => {
    const node = useRef<HTMLElement>(null)
    const composed = useComposedRefs(node, ref)
    const callback = useRef(onStuckChange)
    callback.current = onStuckChange

    useEffect(() => {
      const element = node.current
      if (!element || typeof IntersectionObserver === "undefined") return
      // Sticky elements resolve their offset to px, which is what rootMargin needs.
      const styles = getComputedStyle(element)
      const inset = Number.parseFloat(edge === "top" ? styles.top : styles.bottom) || 0
      const margin =
        edge === "top" ? `${-(inset + 1)}px 0px 0px 0px` : `0px 0px ${-(inset + 1)}px 0px`
      let stuck = false
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry) return
          const bounds = entry.boundingClientRect
          const root = entry.rootBounds
          const next =
            entry.intersectionRatio < 1 &&
            root !== null &&
            (edge === "top" ? bounds.top <= root.top + 1 : bounds.bottom >= root.bottom - 1)
          if (next === stuck) return
          stuck = next
          if (next) element.setAttribute("data-stuck", "")
          else element.removeAttribute("data-stuck")
          callback.current?.(next)
        },
        { rootMargin: margin, threshold: [1] },
      )
      observer.observe(element)
      return () => observer.disconnect()
    }, [edge, offset])

    return (
      <Tag
        ref={composed}
        className={cx(
          "kg-sticky sticky z-10 transition-[background-color,box-shadow] duration-(--kg-duration-base) ease-kg-out",
          edge === "bottom" ? "bottom-[var(--_offset,0)]" : "top-[var(--_offset,0)]",
          className,
        )}
        data-edge={edge}
        style={{ ...vars({ "--_offset": space(offset) }), ...style }}
        {...props}
      />
    )
  },
)

Sticky.displayName = "Sticky"
