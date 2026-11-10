import { type ElementType, forwardRef, type HTMLAttributes } from "react"
import { cx } from "../../utils/cx.js"
import { type BoxAlign, type BoxSpace, alignValue, space, vars } from "../box/space.js"

export type GridBreakpoint = "base" | "sm" | "md" | "lg" | "xl"

/** Column counts by the grid's own width: `sm` 30rem, `md` 48rem, `lg` 64rem, `xl` 80rem. */
export type GridColumns = number | Partial<Record<GridBreakpoint, number>>

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /** The element that holds the cells, a `ul` for a list of cards for instance. */
  as?: ElementType
  /** A fixed count, or counts per container width. Ignored when `minItemWidth` is set. */
  columns?: GridColumns
  /** Fits as many columns as there is room for, none narrower than this CSS length. */
  minItemWidth?: string
  gap?: BoxSpace
  rowGap?: BoxSpace
  align?: BoxAlign
  /** Spreads cells over empty columns in `minItemWidth` mode, instead of keeping their slots. */
  fit?: boolean
}

const BREAKPOINTS: readonly GridBreakpoint[] = ["base", "sm", "md", "lg", "xl"]

const TRACK = {
  /* Each step falls back to the one below it, so `{ base: 1, md: 3 }` holds 1 until md. */
  columns: [
    "grid-cols-[repeat(var(--_cols),minmax(0,1fr))] [--_cols:var(--_c-base,1)]",
    "@min-[30rem]:[--_cols:var(--_c-sm,var(--_c-base,1))]",
    "@min-[48rem]:[--_cols:var(--_c-md,var(--_c-sm,var(--_c-base,1)))]",
    "@min-[64rem]:[--_cols:var(--_c-lg,var(--_c-md,var(--_c-sm,var(--_c-base,1))))]",
    "@min-[80rem]:[--_cols:var(--_c-xl,var(--_c-lg,var(--_c-md,var(--_c-sm,var(--_c-base,1)))))]",
  ],
  fill: "grid-cols-[repeat(auto-fill,minmax(min(var(--_min),100%),1fr))]",
  fit: "grid-cols-[repeat(auto-fit,minmax(min(var(--_min),100%),1fr))]",
}

/**
 * Equal columns that respond to the grid's own width through container queries, so the same
 * grid works in a sidebar, a dialog or a full page without breakpoints tied to the viewport.
 */
export const Grid = forwardRef<HTMLDivElement, GridProps>(
  (
    {
      as: Tag = "div",
      columns = 1,
      minItemWidth,
      gap = 4,
      rowGap,
      align,
      fit = false,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const counts = typeof columns === "number" ? { base: columns } : columns
    const mode = minItemWidth ? (fit ? "fit" : "fill") : "columns"
    return (
      // A size container takes no width from its cells, so it fills its parent instead.
      <div
        ref={ref}
        className={cx("kg-grid @container w-full min-w-0", className)}
        data-mode={mode}
        style={{
          ...vars({
            "--_gap": space(gap),
            "--_row-gap": space(rowGap),
            "--_align": alignValue(align),
            "--_min": minItemWidth,
            ...Object.fromEntries(
              BREAKPOINTS.map((point) => [`--_c-${point}`, counts[point]]),
            ),
          }),
          ...style,
        }}
        {...props}
      >
        <Tag
          className={cx(
            "kg-grid__track m-0 grid list-none p-0 *:min-w-0 [align-items:var(--_align,stretch)]",
            "gap-x-[var(--_gap,calc(var(--kg-space)*4))] gap-y-[var(--_row-gap,var(--_gap,calc(var(--kg-space)*4)))]",
            TRACK[mode],
          )}
        >
          {children}
        </Tag>
      </div>
    )
  },
)

Grid.displayName = "Grid"
