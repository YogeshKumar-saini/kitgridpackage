"use client"

import { type CSSProperties, forwardRef, type HTMLAttributes } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useRovingFocus } from "../../hooks/use-roving-focus.js"
import { cx } from "../../utils/cx.js"

/* A 0.5rem dot every 1.25rem (dot plus 0.75rem gap); the bead slides by that pitch. */
const rootClass =
  "kg-dot-pagination relative inline-flex items-center gap-[0.75rem] px-3 py-2 bg-kg-surface border-2 border-kg-ink rounded-full"

const dotClass = [
  "kg-dot-pagination__dot relative size-[0.5rem] p-0 border-0 rounded-full bg-kg-fg-faint cursor-pointer",
  "transition-[background-color,scale] duration-(--kg-duration-base) ease-kg-out",
  "before:absolute before:-inset-[8px] before:content-['']",
  "hover:bg-kg-fg-muted hover:scale-125",
  "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-kg-ring",
]

const beadClass = [
  "kg-dot-pagination__bead pointer-events-none absolute top-1/2 left-3 z-1 -mt-[0.25rem] size-[0.5rem] rounded-full bg-kg-accent",
  "shadow-[0_0_0_2px_var(--kg-surface),0_0_0_4px_var(--kg-ink)]",
  "[transform:translateX(calc(var(--_index)*1.25rem))_scale(1.35)] transition-transform duration-(--kg-duration-slow) ease-kg-out",
]

export interface DotPaginationProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  count: number
  /** Zero-based current page. */
  value?: number
  defaultValue?: number
  onValueChange?: (index: number) => void
  /** Accessible name for each dot. */
  getLabel?: (index: number, count: number) => string
}

/**
 * Compact page dots for carousels and onboarding. A single bead glides between dots; arrow
 * keys move and select, so the group is one tab stop.
 */
export const DotPagination = forwardRef<HTMLDivElement, DotPaginationProps>(
  (
    {
      count,
      value: valueProp,
      defaultValue = 0,
      onValueChange,
      getLabel = (index, total) => `Page ${index + 1} of ${total}`,
      className,
      style,
      onKeyDown,
      "aria-label": ariaLabel = "Pages",
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const rove = useRovingFocus({ orientation: "horizontal", loop: false })
    const current = Math.min(Math.max(0, value), Math.max(0, count - 1))

    return (
      <div
        ref={ref}
        role="group"
        aria-label={ariaLabel}
        className={cx(rootClass, className)}
        style={{ "--_index": current, ...style } as CSSProperties}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented) return
          const next = rove(event)
          const index = next ? Number(next.dataset.index) : Number.NaN
          if (!Number.isNaN(index)) setValue(index)
        }}
        {...props}
      >
        <span className={cx(beadClass)} aria-hidden="true" />
        {Array.from({ length: count }, (_, index) => (
          <button
            key={index}
            type="button"
            className={cx(dotClass)}
            aria-label={getLabel(index, count)}
            aria-current={index === current || undefined}
            tabIndex={index === current ? 0 : -1}
            data-index={index}
            data-kg-item=""
            onClick={() => setValue(index)}
          />
        ))}
      </div>
    )
  },
)

DotPagination.displayName = "DotPagination"
