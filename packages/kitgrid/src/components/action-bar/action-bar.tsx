"use client"

import { forwardRef, type ReactNode } from "react"
import { usePresence } from "../../hooks/use-presence.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { Toolbar, ToolbarButton, type ToolbarProps, ToolbarSeparator } from "../toolbar/toolbar.js"

export type ActionBarPosition = "fixed" | "absolute"

export interface ActionBarProps extends Omit<ToolbarProps, "orientation"> {
  /** Number of selected items. The bar shows while it is above zero. */
  count: number
  /** Formats the count, e.g. `(n) => \`${n} files\``. */
  formatCount?: (count: number) => ReactNode
  /** Clears the selection: from the close button or Escape inside the bar. */
  onClear?: () => void
  clearLabel?: string
  /** `fixed` floats over the viewport; `absolute` floats over the nearest positioned parent. */
  position?: ActionBarPosition
  /** Actions, usually ToolbarButton elements. */
  children?: ReactNode
}

/* An inverted ink bar on a sage offset; it rises calmly from the bottom edge. */
const barClass = [
  "kg-action-bar z-40 left-1/2 bottom-[max(calc(var(--kg-space)*6),env(safe-area-inset-bottom))] max-w-[calc(100%-var(--kg-space)*6)]",
  "-translate-x-1/2 origin-[50%_100%] data-[position=fixed]:fixed data-[position=absolute]:absolute",
  "[--_toolbar-bg:var(--kg-fg)] [--_toolbar-fg:var(--kg-surface)] [--_toolbar-edge:var(--kg-fg)] [--_toolbar-radius:var(--kg-radius-xl)]",
  "[--_toolbar-shadow:5px_5px_0_var(--kg-paper-sage)] [--_toolbar-separator:color-mix(in_oklab,var(--kg-surface)_30%,transparent)]",
  "[--_toolbar-button:color-mix(in_oklab,var(--kg-surface)_80%,transparent)] [--_toolbar-button-hover:var(--kg-surface)]",
  "[--_toolbar-button-hover-bg:color-mix(in_oklab,var(--kg-surface)_14%,transparent)]",
  "[--kg-enter-y:12px] data-[state=open]:animate-[kg-pop-in_var(--kg-duration-slow)_var(--kg-ease-out)]",
  "data-[state=closed]:pointer-events-none data-[state=closed]:animate-[kg-pop-out_var(--kg-duration-fast)_var(--kg-ease-in)_forwards]",
]

const Close = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** A floating toolbar for bulk actions on a selection, turning up from the bottom edge. */
export const ActionBar = forwardRef<HTMLDivElement, ActionBarProps>(
  (
    {
      count,
      formatCount = (value) => `${value} selected`,
      onClear,
      clearLabel = "Clear selection",
      position = "fixed",
      className,
      children,
      onKeyDown,
      "aria-label": ariaLabel = "Selection actions",
      ...props
    },
    forwardedRef,
  ) => {
    const { ref, present, state } = usePresence<HTMLDivElement>(count > 0)
    const composed = useComposedRefs(ref, forwardedRef)
    if (!present) return null
    return (
      <Toolbar
        ref={composed}
        aria-label={ariaLabel}
        className={cx(barClass, className)}
        data-state={state}
        data-position={position}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.key === "Escape" && onClear) {
            event.preventDefault()
            onClear()
          }
        }}
        {...props}
      >
        <span className="kg-action-bar__count inline-flex items-center gap-2 ps-1 pe-2 text-kg-sm font-medium whitespace-nowrap" aria-live="polite">
          <span className="kg-action-bar__badge grid h-[1.5rem] min-w-[1.5rem] place-items-center rounded-full bg-kg-paper-sage px-[6px] text-kg-xs font-bold tabular-nums text-kg-fg" aria-hidden="true">
            {count}
          </span>
          <span className="kg-action-bar__count-text text-[color-mix(in_oklab,var(--kg-surface)_86%,transparent)] max-[30rem]:sr-only">{formatCount(count)}</span>
        </span>
        <ToolbarSeparator />
        {children}
        {onClear && (
          <>
            <ToolbarSeparator />
            <ToolbarButton label={clearLabel} icon={<Close />} onClick={onClear} />
          </>
        )}
      </Toolbar>
    )
  },
)

ActionBar.displayName = "ActionBar"
