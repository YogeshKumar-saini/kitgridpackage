"use client"

import {
  type ButtonHTMLAttributes,
  createContext,
  type FocusEvent as ReactFocusEvent,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { ROVING_ITEM_SELECTOR, useRovingFocus } from "../../hooks/use-roving-focus.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

export type ToolbarOrientation = "horizontal" | "vertical"

/* ActionBar recolours the bar and its parts through these --_toolbar-* properties. */
const toolbarClass = [
  "kg-toolbar inline-flex items-center gap-0.5 p-1 data-[orientation=vertical]:flex-col",
  "text-[var(--_toolbar-fg,var(--kg-fg))] bg-[var(--_toolbar-bg,var(--kg-surface))]",
  "border-2 border-[var(--_toolbar-edge,var(--kg-ink))] rounded-[var(--_toolbar-radius,var(--kg-radius-lg))]",
  "shadow-[var(--_toolbar-shadow,var(--kg-shadow-sm))]",
]

const buttonClass = [
  "kg-toolbar__button inline-flex items-center justify-center gap-1.5 min-w-(--kg-control-sm) h-kg-sm px-2.5 data-icon-only:p-0",
  "[font-family:inherit] text-kg-sm font-medium bg-transparent border-0 rounded-kg-sm cursor-pointer",
  "text-[var(--_toolbar-button,var(--kg-fg-muted))] transition-[color,background-color,scale] duration-(--kg-duration-fast) ease-kg-out",
  "interactive:hover:text-[var(--_toolbar-button-hover,var(--kg-fg))] interactive:hover:bg-[var(--_toolbar-button-hover-bg,var(--kg-muted))]",
  "interactive:active:scale-[0.94]",
  "data-[state=on]:bg-kg-paper-sage data-[state=on]:text-kg-fg data-[state=on]:interactive:hover:bg-kg-paper-sage data-[state=on]:interactive:hover:text-kg-fg",
  "disabled:cursor-not-allowed disabled:opacity-45",
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-kg-ring",
]

const separatorClass = [
  "kg-toolbar__separator shrink-0 self-stretch w-px m-1 bg-[var(--_toolbar-separator,var(--kg-ink))]",
  "[[data-orientation=vertical]>&]:h-px [[data-orientation=vertical]>&]:w-auto",
]

const OrientationContext = createContext<ToolbarOrientation>("horizontal")

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: ToolbarOrientation
  loop?: boolean
}

/**
 * An APG toolbar: one tab stop for the whole bar, arrow keys and Home/End between controls,
 * and focus remembered when tabbing back in.
 */
export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  (
    { orientation = "horizontal", loop = true, onKeyDown, onFocus, className, ...props },
    forwardedRef,
  ) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const rove = useRovingFocus({ orientation, loop })

    useEffect(() => {
      const node = local.current
      if (!node) return
      const items = Array.from(node.querySelectorAll<HTMLElement>("[data-kg-item]"))
      if (items.some((item) => item.tabIndex === 0)) {
        for (const item of items) if (item.tabIndex !== 0) item.tabIndex = -1
        return
      }
      const first = node.querySelector<HTMLElement>(ROVING_ITEM_SELECTOR)
      for (const item of items) item.tabIndex = item === first ? 0 : -1
    })

    return (
      <OrientationContext.Provider value={orientation}>
        <div
          ref={ref}
          role="toolbar"
          aria-orientation={orientation}
          className={cx(toolbarClass, className)}
          data-orientation={orientation}
          onFocus={(event: ReactFocusEvent<HTMLDivElement>) => {
            onFocus?.(event)
            const target = event.target as HTMLElement
            if (!target.matches("[data-kg-item]")) return
            for (const item of event.currentTarget.querySelectorAll<HTMLElement>(
              "[data-kg-item]",
            ))
              item.tabIndex = item === target ? 0 : -1
          }}
          onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
            onKeyDown?.(event)
            if (event.defaultPrevented) return
            // Text inputs inside a toolbar keep their own arrow keys.
            if ((event.target as HTMLElement).matches("input, textarea, [contenteditable]"))
              return
            rove(event)
          }}
          {...props}
        />
      </OrientationContext.Provider>
    )
  },
)

Toolbar.displayName = "Toolbar"

export interface ToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon-only buttons need a label; it becomes the accessible name. */
  label?: string
  icon?: ReactNode
}

export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ label, icon, className, children, type, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={label}
      tabIndex={-1}
      data-kg-item=""
      className={cx(buttonClass, className)}
      data-icon-only={children == null || undefined}
      {...props}
    >
      {icon != null && (
        <span className="kg-toolbar__icon grid size-4 [&_svg]:size-full" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </button>
  ),
)

ToolbarButton.displayName = "ToolbarButton"

export interface ToolbarToggleProps extends Omit<ToolbarButtonProps, "onChange"> {
  pressed?: boolean
  defaultPressed?: boolean
  onPressedChange?: (pressed: boolean) => void
}

export const ToolbarToggle = forwardRef<HTMLButtonElement, ToolbarToggleProps>(
  ({ pressed: pressedProp, defaultPressed = false, onPressedChange, onClick, ...props }, ref) => {
    const [pressed, setPressed] = useControllableState({
      value: pressedProp,
      defaultValue: defaultPressed,
      onChange: onPressedChange,
    })
    return (
      <ToolbarButton
        ref={ref}
        aria-pressed={pressed}
        data-state={pressed ? "on" : "off"}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) setPressed(!pressed)
        }}
        {...props}
      />
    )
  },
)

ToolbarToggle.displayName = "ToolbarToggle"

export interface ToolbarGroupProps extends HTMLAttributes<HTMLDivElement> {}

export const ToolbarGroup = forwardRef<HTMLDivElement, ToolbarGroupProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} role="group" className={cx("kg-toolbar__group flex [flex-direction:inherit] items-[inherit] gap-[inherit]", className)} {...props} />
  ),
)

ToolbarGroup.displayName = "ToolbarGroup"

export interface ToolbarSeparatorProps extends HTMLAttributes<HTMLDivElement> {}

export const ToolbarSeparator = forwardRef<HTMLDivElement, ToolbarSeparatorProps>(
  ({ className, ...props }, ref) => {
    const orientation = useContext(OrientationContext)
    return (
      <div
        ref={ref}
        role="separator"
        aria-orientation={orientation === "horizontal" ? "vertical" : "horizontal"}
        className={cx(separatorClass, className)}
        {...props}
      />
    )
  },
)

ToolbarSeparator.displayName = "ToolbarSeparator"
