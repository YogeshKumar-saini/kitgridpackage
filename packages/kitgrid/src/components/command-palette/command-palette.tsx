"use client"

import {
  forwardRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { DialogTitle } from "../dialog/dialog.js"
import { ModalRoot, useModalContext, useModalSurface } from "../dialog/modal.js"
import { Kbd } from "../kbd/kbd.js"

export interface CommandPaletteItem {
  id: string
  label: string
  /** Secondary text on the right, such as the section a page lives in. */
  hint?: ReactNode
  icon?: ReactNode
  /** Extra words the filter matches on but never shows. */
  keywords?: readonly string[]
  /** Keys shown on the row, in `Kbd` form: `["mod", "shift", "p"]`. */
  shortcut?: readonly string[]
  disabled?: boolean
  onSelect?: () => void
}

export interface CommandPaletteGroup {
  id?: string
  heading: string
  items: readonly CommandPaletteItem[]
}

/** Returns a rank for `item` against `query`; 0 hides it. Higher ranks sort first. */
export type CommandPaletteFilter = (item: CommandPaletteItem, query: string) => number

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: readonly CommandPaletteGroup[]
  /** Accessible name of the dialog and the search field. */
  label?: string
  placeholder?: string
  query?: string
  defaultQuery?: string
  onQueryChange?: (query: string) => void
  filter?: CommandPaletteFilter
  /** Shown when nothing matches. Receives the trimmed query when given a function. */
  empty?: ReactNode | ((query: string) => ReactNode)
  /** Replaces the key hints along the bottom. Pass `false` to hide them. */
  footer?: ReactNode
  /** Runs after the chosen item's own `onSelect`, just before the palette closes. */
  onSelect?: (item: CommandPaletteItem) => void
  className?: string
}

const WORD_BREAK = /[\s·,()/_.:-]+/

const isWordStart = (text: string, index: number) =>
  index === 0 || WORD_BREAK.test(text.charAt(index - 1))

/**
 * Ported from the dashboard's palette: a row must contain what was typed, or each typed word
 * must start one of its words. Letters scattered in order ("utsa" in "Outlined panels") are
 * noise, not a match.
 */
export const commandPaletteFilter: CommandPaletteFilter = (item, query) => {
  const term = query.trim().toLowerCase()
  if (!term) return 1
  const label = item.label.toLowerCase()
  if (label.startsWith(term)) return 5
  const at = label.indexOf(term)
  if (at > 0 && isWordStart(label, at)) return 4
  if (at > 0) return 3
  const haystack = [label, ...(item.keywords ?? [])].join(" ").toLowerCase()
  if (haystack.includes(term)) return 2
  const words = haystack.split(WORD_BREAK)
  const parts = term.split(/\s+/)
  return parts.every((part) => words.some((word) => word.startsWith(part))) ? 1 : 0
}

type Range = readonly [start: number, end: number]

/** Where the query appears in the label: one run if contiguous, else each word start. */
const matchRanges = (label: string, query: string): Range[] => {
  const term = query.trim().toLowerCase()
  if (!term) return []
  const lower = label.toLowerCase()
  const at = lower.indexOf(term)
  if (at >= 0) return [[at, at + term.length]]
  const ranges: Range[] = []
  for (const part of term.split(/\s+/)) {
    let index = lower.indexOf(part)
    while (index >= 0 && !isWordStart(lower, index))
      index = lower.indexOf(part, index + 1)
    if (index >= 0) ranges.push([index, index + part.length])
  }
  return ranges.sort((a, b) => a[0] - b[0])
}

const Highlight = ({ text, query }: { text: string; query: string }) => {
  const ranges = matchRanges(text, query)
  if (ranges.length === 0) return <>{text}</>
  const out: ReactNode[] = []
  let cursor = 0
  for (const [start, end] of ranges) {
    if (start < cursor) continue
    if (start > cursor) out.push(text.slice(cursor, start))
    out.push(
      <mark
        key={start}
        className="kg-command-palette__match bg-transparent text-inherit font-semibold underline decoration-kg-ink decoration-2 underline-offset-3"
      >
        {text.slice(start, end)}
      </mark>,
    )
    cursor = end
  }
  out.push(text.slice(cursor))
  return <>{out}</>
}

const SearchIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

/* A sheet set high on a flat overlay, so results grow downward; it rises and settles onto its offset. */
const frameClass = [
  "kg-command-palette fixed inset-0 mx-auto mt-[min(12vh,6rem)] mb-auto h-fit w-[min(40rem,calc(100%-var(--kg-space)*8))] max-w-none",
  "max-h-[calc(100dvh-min(12vh,6rem)-var(--kg-space)*4)] overflow-hidden p-0 text-kg-fg bg-kg-surface",
  "border-2 border-kg-ink rounded-kg-2xl shadow-kg-lg outline-none origin-top open:flex open:flex-col",
  "data-[state=open]:animate-[kg-dialog-in_var(--kg-duration-slow)_var(--kg-ease-out)]",
  "data-[state=closed]:pointer-events-none data-[state=closed]:animate-[kg-dialog-out_var(--kg-duration-fast)_var(--kg-ease-in)_forwards]",
  "backdrop:bg-kg-overlay backdrop:animate-[kg-fade-in_var(--kg-duration-base)_var(--kg-ease-out)]",
  "data-[state=closed]:backdrop:animate-[kg-fade-out_var(--kg-duration-fast)_var(--kg-ease-in)_forwards]",
]

const PaletteFrame = forwardRef<
  HTMLDialogElement,
  { initialFocus: RefObject<HTMLElement | null>; className?: string; children: ReactNode }
>(({ initialFocus, className, children }, forwardedRef) => {
  const context = useModalContext("CommandPalette")
  const surface = useModalSurface(context, { dismissible: true, initialFocus })
  const ref = useComposedRefs(surface.ref, forwardedRef)
  if (!surface.present) return null
  return (
    <dialog
      ref={ref}
      className={cx(frameClass, className)}
      data-state={surface.state}
      {...surface.props}
    >
      {children}
    </dialog>
  )
})

PaletteFrame.displayName = "CommandPaletteFrame"

const keyHint = "kg-command-palette__key-hint inline-flex items-center gap-1.5 whitespace-nowrap"

interface Row {
  item: CommandPaletteItem
  domId: string
}

interface VisibleGroup {
  key: string
  heading: string
  headingId: string
  rows: Row[]
}

export const CommandPalette = forwardRef<HTMLDialogElement, CommandPaletteProps>(
  (
    {
      open,
      onOpenChange,
      groups,
      label = "Search and commands",
      placeholder = "Search or jump to…",
      query: queryProp,
      defaultQuery = "",
      onQueryChange,
      filter = commandPaletteFilter,
      empty,
      footer,
      onSelect,
      className,
    },
    ref,
  ) => {
    const [query, setQuery] = useControllableState({
      value: queryProp,
      defaultValue: defaultQuery,
      onChange: onQueryChange,
    })
    const [activeId, setActiveId] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const baseId = useId()
    const listId = `${baseId}-list`

    const visible = useMemo<VisibleGroup[]>(() => {
      let counter = 0
      return groups.flatMap((group, groupIndex) => {
        const ranked = group.items
          .map((item, order) => ({ item, order, rank: filter(item, query) }))
          .filter((entry) => entry.rank > 0)
          .sort((a, b) => b.rank - a.rank || a.order - b.order)
        if (ranked.length === 0) return []
        return [
          {
            key: group.id ?? `${groupIndex}-${group.heading}`,
            heading: group.heading,
            headingId: `${baseId}-g${groupIndex}`,
            rows: ranked.map(({ item }) => ({
              item,
              domId: `${baseId}-o${counter++}`,
            })),
          },
        ]
      })
    }, [groups, filter, query, baseId])

    const enabled = useMemo(
      () => visible.flatMap((group) => group.rows).filter((row) => !row.item.disabled),
      [visible],
    )
    const active =
      enabled.find((row) => row.domId === activeId) ?? enabled[0] ?? undefined
    const total = visible.reduce((sum, group) => sum + group.rows.length, 0)

    useEffect(() => {
      if (!active) return
      document.getElementById(active.domId)?.scrollIntoView?.({ block: "nearest" })
    }, [active])

    const close = () => {
      onOpenChange(false)
      setQuery("")
      setActiveId(null)
    }

    const choose = (row: Row | undefined) => {
      if (!row || row.item.disabled) return
      row.item.onSelect?.()
      onSelect?.(row.item)
      close()
    }

    const move = (delta: number) => {
      if (enabled.length === 0) return
      const index = active ? enabled.indexOf(active) : -1
      const next = enabled[(index + delta + enabled.length) % enabled.length]
      if (next) setActiveId(next.domId)
    }

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) return
      if (event.key === "ArrowDown") move(1)
      else if (event.key === "ArrowUp") move(-1)
      else if (event.key === "PageDown") move(5)
      else if (event.key === "PageUp") move(-5)
      else if (event.key === "Enter") choose(active)
      else return
      event.preventDefault()
    }

    const trimmed = query.trim()
    const emptyContent =
      typeof empty === "function"
        ? empty(trimmed)
        : (empty ?? (
            <>
              <span className="kg-command-palette__empty-title text-kg-base text-kg-fg-muted">
                {trimmed ? `Nothing matches "${trimmed}"` : "Nothing to show yet"}
              </span>
              <span className="kg-command-palette__empty-hint text-kg-xs text-kg-fg-muted">
                Try a shorter word or another spelling.
              </span>
            </>
          ))

    return (
      <ModalRoot
        open={open}
        onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      >
        <PaletteFrame ref={ref} className={className} initialFocus={inputRef}>
          <DialogTitle className="kg-visually-hidden">{label}</DialogTitle>
          <div className="kg-command-palette__search flex items-center gap-3 shrink-0 px-4 border-b-2 border-kg-ink">
            <span className="kg-command-palette__search-icon inline-flex text-kg-accent-strong [&_svg]:size-[1.125rem]">
              <SearchIcon />
            </span>
            <input
              ref={inputRef}
              className={cx(
                "kg-command-palette__input flex-1 min-w-0 h-[3.25rem] p-0 [font-family:inherit] text-kg-md text-kg-fg",
                "bg-transparent border-0 outline-none caret-kg-accent-strong placeholder:text-kg-fg-faint",
              )}
              type="text"
              role="combobox"
              aria-label={label}
              aria-expanded={total > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={active?.domId}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={placeholder}
              value={query}
              onChange={(event) => {
                setQuery(event.currentTarget.value)
                setActiveId(null)
              }}
              onKeyDown={onKeyDown}
            />
            <Kbd keys={["esc"]} size="sm" className="kg-command-palette__esc shrink-0" />
          </div>

          <div
            id={listId}
            role="listbox"
            aria-label={label}
            className={cx(
              "kg-command-palette__list flex-auto min-h-0 max-h-[min(26rem,60dvh)] p-1.5 overflow-y-auto overscroll-contain",
              "scroll-pt-8 scroll-pb-1.5 [&[hidden]]:hidden",
            )}
            hidden={total === 0}
          >
            {visible.map((group) => (
              <div
                key={group.key}
                role="group"
                aria-labelledby={group.headingId}
                className="kg-command-palette__group [&+&]:mt-1"
              >
                <div
                  id={group.headingId}
                  role="presentation"
                  className="kg-command-palette__heading px-2 pt-2.5 pb-1 text-kg-xs font-semibold tracking-[0.04em] text-kg-fg-muted"
                >
                  {group.heading}
                </div>
                {group.rows.map((row) => {
                  const { item } = row
                  const selected = row === active
                  return (
                    <div
                      key={item.id}
                      id={row.domId}
                      role="option"
                      aria-selected={selected}
                      aria-disabled={item.disabled || undefined}
                      data-active={selected || undefined}
                      className={cx(
                        "kg-command-palette__item relative flex items-center gap-2.5 min-h-[2.5rem] px-2 py-1.5 text-kg-base text-kg-fg",
                        "rounded-kg-md cursor-default select-none transition-colors duration-(--kg-duration-fast) ease-kg-out",
                        "before:absolute before:inset-y-1/4 before:start-0 before:w-[2px] before:rounded-full before:bg-kg-ink",
                        "before:transition-opacity before:duration-(--kg-duration-fast)",
                        "aria-disabled:opacity-50",
                        selected ? "bg-kg-muted before:opacity-100" : "before:opacity-0",
                      )}
                      // Keeps focus in the field, which owns the keyboard.
                      onMouseDown={(event) => event.preventDefault()}
                      onPointerMove={() => {
                        if (!item.disabled && !selected) setActiveId(row.domId)
                      }}
                      onClick={() => choose(row)}
                    >
                      {item.icon != null && (
                        <span
                          className={cx(
                            "kg-command-palette__icon grid place-items-center shrink-0 size-[1.75rem] rounded-kg-sm [&_svg]:size-[0.9375rem]",
                            "transition-colors duration-(--kg-duration-fast) ease-kg-out",
                            selected ? "text-kg-fg bg-kg-paper-sage" : "text-kg-fg-muted bg-kg-surface-sunken",
                          )}
                          aria-hidden="true"
                        >
                          {item.icon}
                        </span>
                      )}
                      <span className="kg-command-palette__label min-w-0 truncate">
                        <Highlight text={item.label} query={query} />
                      </span>
                      {item.hint != null && (
                        <span className="kg-command-palette__hint ms-auto ps-3 truncate text-kg-sm text-kg-fg-muted">
                          {item.hint}
                        </span>
                      )}
                      {item.shortcut && (
                        <Kbd
                          keys={[...item.shortcut]}
                          size="sm"
                          className={cx(
                            "kg-command-palette__shortcut shrink-0",
                            item.hint != null ? "ms-2" : "ms-auto",
                          )}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {total === 0 && (
            <div className="kg-command-palette__empty grid gap-1 px-6 py-10 text-center">{emptyContent}</div>
          )}

          <div role="status" className="kg-visually-hidden">
            {trimmed ? `${total} ${total === 1 ? "result" : "results"}` : ""}
          </div>

          {footer !== false && (
            <div
              className={cx(
                "kg-command-palette__footer flex items-center gap-4 shrink-0 px-4 py-2 overflow-x-auto text-kg-xs text-kg-fg-muted",
                "bg-kg-surface-sunken border-t-2 border-kg-ink [scrollbar-width:none]",
              )}
            >
              {footer ?? (
                <>
                  <span className={keyHint}>
                    <Kbd keys={["up", "down"]} separator={null} size="sm" /> Move
                  </span>
                  <span className={keyHint}>
                    <Kbd keys={["enter"]} size="sm" /> Select
                  </span>
                  <span className={keyHint}>
                    <Kbd keys={["esc"]} size="sm" /> Close
                  </span>
                </>
              )}
            </div>
          )}
        </PaletteFrame>
      </ModalRoot>
    )
  },
)

CommandPalette.displayName = "CommandPalette"
