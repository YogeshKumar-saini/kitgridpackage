"use client"

import { type ReactNode, type RefObject, useEffect } from "react"
import { useDismiss } from "../../hooks/use-dismiss.js"
import { type Side, useFloating } from "../../hooks/use-floating.js"
import { usePresence } from "../../hooks/use-presence.js"
import { cx } from "../../utils/cx.js"

/* Shared, unexported plumbing for the listbox-based pickers in this package. */

type ListSize = "sm" | "md" | "lg"

const listText: Record<ListSize, string> = {
  sm: "text-kg-sm",
  md: "text-kg-base",
  lg: "text-kg-md",
}

/* Paper Layers: the same sheet as Select's listbox, settling onto its offset as it opens. */
/** `panel` is a sheet with a header (search box, breadcrumb) above its own scrolling list. */
export const listboxClass = (size: ListSize = "md", kind: "list" | "panel" = "list") =>
  cx(
    "kg-combobox__listbox",
    kind === "list"
      ? "max-h-[min(18rem,calc(100dvh-2rem))] p-1 overflow-y-auto overscroll-contain"
      : "grid grid-rows-[auto_minmax(0,1fr)] max-h-[min(20rem,calc(100dvh-2rem))] p-0 overflow-hidden",
    "rounded-kg-lg border-2 border-kg-ink bg-kg-surface text-kg-fg shadow-kg-md",
    "origin-(--kg-origin,top_center) data-[side=bottom]:[--kg-enter-y:-4px] data-[side=top]:[--kg-enter-y:4px]",
    "data-[state=open]:animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)]",
    "data-[state=closed]:pointer-events-none data-[state=closed]:animate-[kg-pop-out_var(--kg-duration-fast)_var(--kg-ease-in)_forwards]",
    listText[size],
  )

export const optionClass = cx(
  "kg-combobox__option flex items-center gap-2.5 min-h-(--kg-control-sm) px-2.5 py-1.5 leading-[1.3]",
  "rounded-kg-sm cursor-default select-none transition-colors duration-(--kg-duration-fast) ease-kg-out",
  "data-active:bg-kg-muted aria-selected:font-semibold",
  "aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
)

export const optionIconClass =
  "kg-combobox__icon inline-grid place-items-center shrink-0 size-[1rem] text-kg-fg-muted [&_svg]:size-full [&_img]:size-full"

export const optionTextClass = "kg-combobox__text grid gap-[0.15em] flex-1 min-w-0"

export const optionLabelClass = "kg-combobox__label truncate"

export const optionDescriptionClass =
  "kg-combobox__description text-kg-xs font-normal text-kg-fg-muted"

export const optionCheckClass =
  "kg-combobox__check inline-grid place-items-center shrink-0 size-[1rem] text-kg-accent-strong [&_svg]:size-full"

export const emptyClass =
  "kg-combobox__empty px-3 py-4 text-kg-sm text-center text-kg-fg-muted"

const svg = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const

export const CheckIcon = () => (
  <svg {...svg} strokeWidth="2.5">
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

export const ChevronDownIcon = () => (
  <svg {...svg} strokeWidth="2">
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const ChevronRightIcon = () => (
  <svg {...svg} strokeWidth="2">
    <path d="m9 6 6 6-6 6" />
  </svg>
)

export const ChevronLeftIcon = () => (
  <svg {...svg} strokeWidth="2">
    <path d="m15 6-6 6 6 6" />
  </svg>
)

export const XIcon = () => (
  <svg {...svg} strokeWidth="2">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

export const SearchIcon = () => (
  <svg {...svg} strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export const PlusIcon = () => (
  <svg {...svg} strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const MinusIcon = () => (
  <svg {...svg} strokeWidth="2">
    <path d="M5 12h14" />
  </svg>
)

export interface ListItemLike {
  label: string
  disabled?: boolean | undefined
}

export const matchesQuery = (label: string, query: string): boolean =>
  label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())

/** Next enabled index `delta` steps away, wrapping. Returns -1 when nothing is enabled. */
export const stepIndex = (
  items: readonly ListItemLike[],
  from: number,
  delta: 1 | -1,
): number => {
  const count = items.length
  if (count === 0) return -1
  let index = from < 0 ? (delta > 0 ? -1 : count) : from
  for (let tries = 0; tries < count; tries++) {
    index = (index + delta + count) % count
    if (!items[index]?.disabled) return index
  }
  return -1
}

export const firstEnabled = (items: readonly ListItemLike[]): number =>
  items.findIndex((item) => !item.disabled)

/** Wraps the first case-insensitive match of `query` in a <mark>. */
export const Highlight = ({
  text,
  query,
}: {
  text: string
  query: string
}): ReactNode => {
  const needle = query.trim().toLocaleLowerCase()
  const at = needle ? text.toLocaleLowerCase().indexOf(needle) : -1
  if (at < 0) return text
  return (
    <>
      {text.slice(0, at)}
      <mark className="kg-combobox__mark bg-transparent text-inherit font-bold underline decoration-kg-ink decoration-2 underline-offset-3">
        {text.slice(at, at + needle.length)}
      </mark>
      {text.slice(at + needle.length)}
    </>
  )
}

export interface PopupOptions {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  onDismiss: () => void
  side?: Side
  matchWidth?: boolean
  align?: "start" | "center" | "end"
}

/** Presence, positioning and dismissal for a layer anchored to a field. */
export const usePopup = <T extends HTMLElement = HTMLDivElement>({
  open,
  anchorRef,
  onDismiss,
  side = "bottom",
  matchWidth = true,
  align = "start",
}: PopupOptions) => {
  const presence = usePresence<T>(open)
  useFloating(anchorRef, presence.ref, { open, side, align, offset: 6, matchWidth })
  useDismiss({ enabled: open, refs: [anchorRef, presence.ref], onDismiss })
  return presence
}

/** Keeps the active option visible by scrolling only the list, never the page. */
export const useScrollActive = (
  listRef: RefObject<HTMLElement | null>,
  active: number,
  open: boolean,
): void => {
  useEffect(() => {
    const list = listRef.current
    const option = list?.querySelector<HTMLElement>(`[data-index="${active}"]`)
    if (!open || !list || !option) return
    const top = option.offsetTop
    const bottom = top + option.offsetHeight
    if (top < list.scrollTop) list.scrollTop = top
    else if (bottom > list.scrollTop + list.clientHeight)
      list.scrollTop = bottom - list.clientHeight
  }, [listRef, active, open])
}

/**
 * A popup trigger is a button, so its label would hide the value it shows. Pointing
 * `aria-labelledby` at the label (or the button's own `aria-label`) and then the value keeps
 * both in the name: "Time zone, Tokyo".
 */
export const triggerLabelledBy = (options: {
  labelledBy: string | undefined
  labelId: string | undefined
  ariaLabel: string | undefined
  selfId: string
  valueId: string
  hasValue: boolean
}): string | undefined => {
  const { labelledBy, labelId, ariaLabel, selfId, valueId, hasValue } = options
  if (labelledBy) return labelledBy
  if (!hasValue) return undefined
  if (labelId) return `${labelId} ${valueId}`
  if (ariaLabel) return `${selfId} ${valueId}`
  return undefined
}
