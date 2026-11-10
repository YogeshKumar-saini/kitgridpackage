"use client"

import { useEffect } from "react"
import { useEventCallback } from "../../hooks/use-event-callback.js"

const MODIFIERS = new Set(["mod", "ctrl", "control", "alt", "option", "shift", "meta"])

const isEditable = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

/**
 * True when `event` is the combination in `keys`, written the way `Kbd` takes it
 * (`["mod", "k"]`, `["/"]`, `["shift", "?"]`). `mod` accepts Cmd or Ctrl so one binding
 * works on every platform.
 */
export const matchesShortcut = (
  event: KeyboardEvent,
  keys: readonly string[],
): boolean => {
  const tokens = keys.map((key) => key.toLowerCase())
  const key = tokens.find((token) => !MODIFIERS.has(token))
  if (!key) return false
  const mod = tokens.includes("mod")
  const ctrl = tokens.includes("ctrl") || tokens.includes("control")
  const meta = tokens.includes("meta")
  const alt = tokens.includes("alt") || tokens.includes("option")
  const shift = tokens.includes("shift")

  if (mod ? !(event.metaKey || event.ctrlKey) : event.metaKey !== meta) return false
  if (!mod && event.ctrlKey !== ctrl) return false
  if (event.altKey !== alt) return false
  // Symbols such as "?" already need Shift on most layouts, so only letters check it.
  if (/^[a-z]$/.test(key) && event.shiftKey !== shift) return false

  const pressed = event.key.toLowerCase()
  // Alt and Option change event.key into another character; the physical code does not.
  return pressed === key || event.code.toLowerCase() === `key${key}`
}

/** Runs `handler` when the combination is pressed anywhere in the document. */
export const useShortcut = (
  keys: readonly string[],
  handler: (event: KeyboardEvent) => void,
  { enabled = true }: { enabled?: boolean } = {},
): void => {
  const run = useEventCallback(handler)
  const signature = keys.join("+")

  useEffect(() => {
    if (!enabled) return
    const tokens = signature.split("+")
    const plain = !tokens.some((token) =>
      ["mod", "ctrl", "control", "meta", "alt", "option"].includes(token.toLowerCase()),
    )
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return
      // A bare "/" typed into a field is text, not a command.
      if (plain && isEditable(event.target)) return
      if (!matchesShortcut(event, tokens)) return
      event.preventDefault()
      run(event)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [enabled, signature, run])
}

export interface CommandShortcutOptions {
  enabled?: boolean
  /** Defaults to `["mod", "k"]`: Cmd+K on Apple platforms, Ctrl+K elsewhere. */
  keys?: readonly string[]
}

const DEFAULT_KEYS = ["mod", "k"] as const

/** Calls `handler` on Cmd/Ctrl+K, the usual way to summon a command palette. */
export const useCommandShortcut = (
  handler: (event: KeyboardEvent) => void,
  { keys = DEFAULT_KEYS, enabled = true }: CommandShortcutOptions = {},
): void => useShortcut(keys, handler, { enabled })
