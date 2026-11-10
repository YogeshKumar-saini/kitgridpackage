import { Fragment, forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"
import { KbdPlatformKey, type KbdPlatformToken } from "./kbd-platform-key.js"

export type KbdSize = "sm" | "md"

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  /**
   * A key combination, one entry per key. `"mod"` renders ⌘ on Apple platforms and Ctrl
   * elsewhere; `"alt"`, `"ctrl"`, `"shift"`, `"enter"`, arrows and friends get their glyphs.
   */
  keys?: string[]
  /** Shown between keys. Pass `null` for a compact ⌘K look. */
  separator?: ReactNode
  size?: KbdSize
}

/* Paper Layers: a keycap is a small white sheet with an ink edge and a 2px ink lip below. */
const keycap =
  "inline-flex h-(--_height) min-w-(--_height) items-center justify-center gap-[0.2em] rounded-kg-sm border border-kg-ink bg-kg-surface px-[0.4em] text-kg-fg shadow-[0_2px_0_var(--kg-ink)]"

const root =
  "kg-kbd whitespace-nowrap align-middle [font-family:inherit] text-(length:--_text) font-semibold leading-none"

const SIZE: Record<KbdSize, string> = {
  sm: "[--_height:1.125rem] [--_text:0.6875rem]",
  md: "[--_height:1.375rem] [--_text:var(--kg-text-xs)]",
}

const platformTokens = new Set<string>(["mod", "alt", "option", "ctrl", "control"])

const named: Record<string, [glyph: string, label: string]> = {
  shift: ["⇧", "Shift"],
  enter: ["↵", "Enter"],
  return: ["↵", "Return"],
  esc: ["Esc", "Escape"],
  escape: ["Esc", "Escape"],
  tab: ["Tab", "Tab"],
  backspace: ["⌫", "Backspace"],
  delete: ["Del", "Delete"],
  space: ["Space", "Space"],
  up: ["↑", "Up arrow"],
  down: ["↓", "Down arrow"],
  left: ["←", "Left arrow"],
  right: ["→", "Right arrow"],
}

const renderKey = (key: string): ReactNode => {
  const token = key.toLowerCase()
  if (platformTokens.has(token)) {
    const platform: KbdPlatformToken =
      token === "option"
        ? "alt"
        : token === "control"
          ? "ctrl"
          : (token as KbdPlatformToken)
    return <KbdPlatformKey token={platform} />
  }
  const entry = named[token]
  if (!entry) return key.length === 1 ? key.toUpperCase() : key
  const [glyph, label] = entry
  if (glyph === label) return glyph
  return (
    <>
      <span aria-hidden="true">{glyph}</span>
      <span className="kg-visually-hidden">{label}</span>
    </>
  )
}

/** A keyboard key or shortcut. Server-safe; only platform-aware keys hydrate a tiny client part. */
export const Kbd = forwardRef<HTMLElement, KbdProps>(
  ({ keys, separator = "+", size = "md", className, children, ...props }, ref) => {
    if (!keys) {
      return (
        <kbd
          ref={ref}
          className={cx(root, SIZE[size], keycap, className)}
          data-size={size}
          {...props}
        >
          {children}
        </kbd>
      )
    }

    return (
      // The combo root keeps the UA inline display, so a host's `hidden` class still hides it.
      <kbd
        ref={ref}
        className={cx(root, SIZE[size], className)}
        data-size={size}
        data-combo=""
        {...props}
      >
        {keys.map((key, index) => (
          <Fragment key={`${key}-${index}`}>
            {index > 0 && separator != null && (
              <span className="kg-kbd__separator mx-[0.25em] text-[0.95em] text-kg-fg-muted">{separator}</span>
            )}
            <kbd className={cx("kg-kbd__key [font:inherit] [&+&]:ms-[0.25em]", keycap)}>{renderKey(key)}</kbd>
          </Fragment>
        ))}
      </kbd>
    )
  },
)

Kbd.displayName = "Kbd"
