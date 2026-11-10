import { forwardRef, type HTMLAttributes } from "react"
import { cx } from "../../utils/cx.js"
import { type BoxSpace, space, vars } from "../box/space.js"

export interface ReelProps extends HTMLAttributes<HTMLDivElement> {
  /** Names the scroll region so keyboard users know what they are scrolling. */
  label: string
  /** Width of each item: any CSS length. Items keep their own width otherwise. */
  itemWidth?: string
  gap?: BoxSpace
  /** Snaps items to the start edge as the reel scrolls. On by default. */
  snap?: boolean
  /** Hides the scrollbar. Scrolling still works by touch, wheel and keyboard. */
  hideScrollbar?: boolean
}

/** A horizontal strip that scrolls instead of wrapping, with snap points and a thin bar. */
export const Reel = forwardRef<HTMLDivElement, ReelProps>(
  (
    {
      label,
      itemWidth,
      gap = 3,
      snap = true,
      hideScrollbar = false,
      className,
      style,
      ...props
    },
    ref,
  ) => (
    // Focusable, so the strip scrolls with arrow keys when its items are not interactive.
    <div
      ref={ref}
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cx(
        "kg-reel flex min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-kg-sm",
        "gap-[var(--_gap,calc(var(--kg-space)*3))] *:min-w-0 *:shrink-0 *:grow-0 *:basis-[var(--_item,auto)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
        "motion-safe:scroll-smooth [[data-kg-motion=reduce]_&]:scroll-auto",
        snap && "snap-x snap-mandatory *:snap-start",
        hideScrollbar
          ? "pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "pb-2 [scrollbar-color:var(--kg-border-strong)_transparent] [scrollbar-width:thin]",
        className,
      )}
      data-snap={snap || undefined}
      data-hide-scrollbar={hideScrollbar || undefined}
      style={{ ...vars({ "--_item": itemWidth, "--_gap": space(gap) }), ...style }}
      {...props}
    />
  ),
)

Reel.displayName = "Reel"
