"use client"

import { forwardRef, useDeferredValue, useEffect, useId, useState } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import {
  Dialog,
  DialogBody,
  DialogContent,
  type DialogContentProps,
  DialogHeader,
  DialogTitle,
} from "../dialog/dialog.js"
import { Kbd } from "../kbd/kbd.js"

export interface KeyboardShortcut {
  /** One entry per key, in Kbd notation: `["mod", "k"]`. */
  keys: string[]
  label: string
}

export interface KeyboardShortcutGroup {
  title: string
  shortcuts: KeyboardShortcut[]
}

export interface KeyboardShortcutsDialogProps
  extends Omit<DialogContentProps, "title" | "children"> {
  groups: KeyboardShortcutGroup[]
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Printable key that opens the dialog from anywhere outside a text field. `null` disables. */
  hotkey?: string | null
  title?: string
  searchable?: boolean
  searchLabel?: string
  emptyLabel?: string
}

const searchClass = [
  "kg-shortcuts__search mt-1.5 h-kg-md w-full px-3 [font-family:inherit] text-kg-base text-kg-fg placeholder:text-kg-fg-muted",
  "bg-kg-surface border-2 border-kg-ink rounded-kg-md outline-none",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
]

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

/** A searchable cheat sheet of keyboard shortcuts, summoned with `?`. */
export const KeyboardShortcutsDialog = forwardRef<
  HTMLDialogElement,
  KeyboardShortcutsDialogProps
>(
  (
    {
      groups,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      hotkey = "?",
      title = "Keyboard shortcuts",
      searchable = true,
      searchLabel = "Search shortcuts",
      emptyLabel = "No matches",
      size = "lg",
      className,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = useControllableState({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    })
    const [query, setQuery] = useState("")
    const deferred = useDeferredValue(query).trim().toLowerCase()
    const id = useId()

    useEffect(() => {
      if (!hotkey) return
      const onKey = (event: KeyboardEvent) => {
        if (event.key !== hotkey || event.metaKey || event.ctrlKey || event.altKey) return
        if (isTyping(event.target)) return
        event.preventDefault()
        setOpen(true)
      }
      document.addEventListener("keydown", onKey)
      return () => document.removeEventListener("keydown", onKey)
    }, [hotkey, setOpen])

    useEffect(() => {
      if (!open) setQuery("")
    }, [open])

    const filtered = groups
      .map((group) => ({
        ...group,
        shortcuts: group.shortcuts.filter(
          (shortcut) =>
            !deferred ||
            shortcut.label.toLowerCase().includes(deferred) ||
            group.title.toLowerCase().includes(deferred),
        ),
      }))
      .filter((group) => group.shortcuts.length > 0)

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          ref={ref}
          size={size}
          className={cx("kg-shortcuts", className)}
          {...props}
        >
          <DialogHeader className="kg-shortcuts__header">
            <DialogTitle>{title}</DialogTitle>
            {searchable && (
              <input
                type="search"
                className={cx(searchClass)}
                aria-label={searchLabel}
                aria-controls={`${id}-results`}
                placeholder={searchLabel}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            )}
          </DialogHeader>
          <DialogBody id={`${id}-results`} className="kg-shortcuts__body max-h-[min(28rem,60dvh)]">
            {filtered.length === 0 ? (
              <p className="kg-shortcuts__empty m-0 py-8 text-center text-kg-fg-muted" role="status">
                {emptyLabel}
              </p>
            ) : (
              <div className="kg-shortcuts__groups [columns:2_16rem] gap-x-8">
                {filtered.map((group, index) => (
                  <section
                    key={group.title}
                    className="kg-shortcuts__group mb-5 break-inside-avoid"
                    aria-labelledby={`${id}-g${index}`}
                  >
                    <h3 id={`${id}-g${index}`} className="kg-shortcuts__group-title m-0 mb-2 text-kg-xs font-semibold tracking-[0.04em] text-kg-fg-muted uppercase">
                      {group.title}
                    </h3>
                    <dl className="kg-shortcuts__list m-0 grid">
                      {group.shortcuts.map((shortcut) => (
                        <div key={shortcut.label} className="kg-shortcuts__row flex items-center justify-between gap-4 border-b border-kg-border py-2 last:border-b-0">
                          <dt className="text-kg-sm text-kg-fg">{shortcut.label}</dt>
                          <dd className="m-0 shrink-0">
                            <Kbd keys={shortcut.keys} size="sm" />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    )
  },
)

KeyboardShortcutsDialog.displayName = "KeyboardShortcutsDialog"
