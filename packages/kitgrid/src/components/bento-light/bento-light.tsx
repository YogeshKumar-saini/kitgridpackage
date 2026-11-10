"use client"

import { type CSSProperties, forwardRef, type HTMLAttributes, useRef } from "react"
import { type PointerSample, usePointerVars } from "../../hooks/use-pointer-vars.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

export interface BentoLightProps extends HTMLAttributes<HTMLDivElement> {
  /** Grid columns at full width. Cells collapse to one column on narrow screens. */
  columns?: number
  /** Any CSS color. Defaults to sage paper. */
  color?: string
  /** Reach of the light, in px. Neighbouring cells within it glow too. */
  radius?: number
}

export interface BentoLightCellProps extends HTMLAttributes<HTMLDivElement> {
  colSpan?: number
  rowSpan?: number
}

const CELL = ":scope > .kg-bento-light__cell"

const gridClass = cx(
  "kg-bento-light grid grid-flow-dense grid-cols-[repeat(var(--kg-bento-columns,3),minmax(0,1fr))] gap-3",
  "max-[40rem]:grid-cols-1 max-[40rem]:[&>.kg-bento-light__cell]:col-auto!",
)

/*
 * Paper Layers: each cell is an ink-edged sheet. The travelling light is a faint paper wash inside
 * and, through two XOR'd masks, a lit ring along the edge wherever the light reaches.
 */
const cellClass = cx(
  "kg-bento-light__cell group/cell relative isolate min-w-0 rounded-kg-xl border-2 border-kg-ink bg-kg-surface p-5 text-kg-fg shadow-kg-sm",
  "before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:opacity-0 before:content-['']",
  "before:bg-[radial-gradient(calc(var(--kg-bento-radius,260px)*0.9)_circle_at_var(--kg-bento-x,-999px)_var(--kg-bento-y,-999px),color-mix(in_oklab,var(--kg-bento-color,var(--kg-paper-sage))_40%,transparent),transparent_70%)]",
  "after:pointer-events-none after:absolute after:-inset-0.5 after:rounded-[inherit] after:p-0.5 after:opacity-0 after:content-['']",
  "after:bg-[radial-gradient(var(--kg-bento-radius,260px)_circle_at_var(--kg-bento-x,-999px)_var(--kg-bento-y,-999px),var(--kg-bento-color,var(--kg-paper-sage)),transparent_65%)]",
  "after:[mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)]",
  "before:transition-opacity after:transition-opacity before:duration-(--kg-duration-slow) after:duration-(--kg-duration-slow) before:ease-kg-out after:ease-kg-out",
  "in-data-[pointer=in]:before:opacity-100 in-data-[pointer=in]:after:opacity-100 focus-within:after:opacity-100",
)

/**
 * A bento grid lit by one light that travels across it: every cell knows where the pointer is
 * in its own box, so edges glow on whichever cells the pointer nears, neighbours included.
 * A single listener on the grid, one write per cell per frame, no re-renders.
 */
export const BentoLight = forwardRef<HTMLDivElement, BentoLightProps>(
  ({ columns = 3, color, radius = 260, className, style, ...props }, forwardedRef) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)

    usePointerVars(local, {
      onMove: ({ x, y, rect }: PointerSample) => {
        const node = local.current
        if (!node) return
        for (const cell of node.querySelectorAll<HTMLElement>(CELL)) {
          const box = cell.getBoundingClientRect()
          cell.style.setProperty("--kg-bento-x", `${rect.left + x - box.left}px`)
          cell.style.setProperty("--kg-bento-y", `${rect.top + y - box.top}px`)
        }
      },
    })

    return (
      <div
        ref={ref}
        className={cx(gridClass, className)}
        style={
          {
            "--kg-bento-columns": Math.max(Math.round(columns), 1),
            "--kg-bento-radius": `${Math.max(radius, 0)}px`,
            ...(color ? { "--kg-bento-color": color } : null),
            ...style,
          } as CSSProperties
        }
        {...props}
      />
    )
  },
)

BentoLight.displayName = "BentoLight"

/** One tile of a `BentoLight` grid. Server-component safe. */
export const BentoLightCell = forwardRef<HTMLDivElement, BentoLightCellProps>(
  ({ colSpan, rowSpan, className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cx(cellClass, className)}
      style={{
        ...(colSpan ? { gridColumn: `span ${colSpan}` } : null),
        ...(rowSpan ? { gridRow: `span ${rowSpan}` } : null),
        ...style,
      }}
      {...props}
    />
  ),
)

BentoLightCell.displayName = "BentoLightCell"
