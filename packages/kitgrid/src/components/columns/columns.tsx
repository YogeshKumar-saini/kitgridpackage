import { type ElementType, forwardRef, type HTMLAttributes } from "react"
import { cx } from "../../utils/cx.js"
import { type BoxAlign, type BoxSpace, alignValue, space, vars } from "../box/space.js"

export interface ColumnsProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  /** Which child is the side column: the first (`start`) or the last (`end`). */
  side?: "start" | "end"
  /** The side column's preferred width. */
  sideWidth?: string
  /** Once the main column would be narrower than this share, both stack. */
  contentMin?: string
  gap?: BoxSpace
  align?: BoxAlign
}

/* The side column keeps its width; the main one grows and wraps below once squeezed. */
const SIDE = {
  start: [
    "[&>:first-child]:grow [&>:first-child]:basis-[var(--_side,16rem)]",
    "[&>:last-child]:grow-999 [&>:last-child]:basis-0 [&>:last-child]:min-w-[var(--_content-min,55%)]",
  ],
  end: [
    "[&>:last-child]:grow [&>:last-child]:basis-[var(--_side,16rem)]",
    "[&>:first-child]:grow-999 [&>:first-child]:basis-0 [&>:first-child]:min-w-[var(--_content-min,55%)]",
  ],
}

/**
 * A side column and a main column that stack on their own when space runs out, with no media
 * queries: the layout reacts to its own width.
 */
export const Columns = forwardRef<HTMLElement, ColumnsProps>(
  (
    {
      as: Tag = "div",
      side = "start",
      sideWidth = "16rem",
      contentMin = "55%",
      gap = 6,
      align,
      className,
      style,
      ...props
    },
    ref,
  ) => (
    <Tag
      ref={ref}
      className={cx(
        "kg-columns flex min-w-0 flex-wrap *:min-w-0",
        "[align-items:var(--_align,stretch)] gap-[var(--_gap,calc(var(--kg-space)*6))]",
        SIDE[side],
        className,
      )}
      data-side={side}
      style={{
        ...vars({
          "--_side": sideWidth,
          "--_content-min": contentMin,
          "--_gap": space(gap),
          "--_align": alignValue(align),
        }),
        ...style,
      }}
      {...props}
    />
  ),
)

Columns.displayName = "Columns"
