"use client"

import {
  Children,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  useRef,
} from "react"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

export interface MasonryProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Narrowest a column gets before the count drops. Any px value. */
  minColumnWidth?: number
  /** Fixed column count; overrides `minColumnWidth`. */
  columns?: number
  /** Gap between items, in px. */
  gap?: number
}

/**
 * Packs items into the shortest column while keeping DOM order, so Tab and screen readers move
 * through items as authored. Until measured (and on the server) it falls back to CSS columns.
 */
export const Masonry = forwardRef<HTMLDivElement, MasonryProps>(
  (
    { children, minColumnWidth = 220, columns, gap = 16, className, style, ...props },
    forwardedRef,
  ) => {
    const root = useRef<HTMLDivElement>(null)
    const composed = useComposedRefs(root, forwardedRef)
    // toArray already drops null, undefined and booleans.
    const items = Children.toArray(children)

    useIsomorphicLayoutEffect(() => {
      const node = root.current
      if (!node) return
      let frame = 0
      const layout = () => {
        frame = 0
        const width = node.clientWidth
        if (width === 0) return
        const count = Math.max(
          1,
          columns ?? Math.floor((width + gap) / (minColumnWidth + gap)),
        )
        const columnWidth = (width - gap * (count - 1)) / count
        const heights = new Array<number>(count).fill(0)
        const cells = Array.from(node.children) as HTMLElement[]
        for (const cell of cells) cell.style.width = `${columnWidth}px`
        for (const cell of cells) {
          let target = 0
          for (let c = 1; c < count; c++) if ((heights[c] as number) < (heights[target] as number) - 1) target = c
          const x = target * (columnWidth + gap)
          const y = heights[target] as number
          cell.style.transform = `translate(${x}px, ${y}px)`
          heights[target] = y + cell.offsetHeight + gap
        }
        node.style.height = `${Math.max(0, Math.max(...heights) - gap)}px`
        node.dataset.ready = ""
      }
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(layout)
      }
      layout()
      // Transitions start one frame after the first placement, so items don't fly in on load.
      const settle = requestAnimationFrame(() => {
        node.dataset.settled = ""
      })
      if (typeof ResizeObserver === "undefined") return () => cancelAnimationFrame(settle)
      const observer = new ResizeObserver(schedule)
      observer.observe(node)
      for (const cell of Array.from(node.children)) observer.observe(cell)
      return () => {
        observer.disconnect()
        cancelAnimationFrame(frame)
        cancelAnimationFrame(settle)
      }
    }, [items.length, columns, minColumnWidth, gap])

    return (
      <div
        ref={composed}
        className={cx(
          "kg-masonry relative gap-(--_gap) [columns:var(--_columns)] data-ready:[columns:auto]",
          className,
        )}
        style={
          {
            "--_gap": `${gap}px`,
            "--_columns": `${columns ?? "auto"} ${minColumnWidth}px`,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        {items.map((child, index) => (
          <div
            key={isValidElement(child) && child.key != null ? child.key : index}
            className="kg-masonry__item mb-(--_gap) break-inside-avoid [[data-ready]>&]:absolute [[data-ready]>&]:top-0 [[data-ready]>&]:left-0 [[data-ready]>&]:m-0 [[data-settled]>&]:transition-transform [[data-settled]>&]:duration-(--kg-duration-slow) [[data-settled]>&]:ease-kg-spring"
          >
            {child}
          </div>
        ))}
      </div>
    )
  },
)
Masonry.displayName = "Masonry"
