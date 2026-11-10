"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { cx } from "../../utils/cx.js"
import { Highlight } from "../highlight/highlight.js"
import { useVirtualWindow } from "../virtual-list/use-virtual-window.js"

export type LogViewerLevel = "debug" | "info" | "warn" | "error"

export interface LogViewerEntry {
  id?: string | number
  /** Pre-formatted string, or a Date printed as HH:MM:SS. */
  time?: string | Date
  level: LogViewerLevel
  message: string
  source?: string
}

export interface LogViewerLabels {
  search?: string
  levels?: string
  latest?: string
  empty?: string
}

export interface LogViewerProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  entries: LogViewerEntry[]
  /** Viewport height, in px. */
  height?: number
  rowHeight?: number
  /** Keeps the newest line in view while the reader is at the bottom. */
  follow?: boolean
  /** Hides the level filters and search. */
  hideToolbar?: boolean
  defaultLevels?: LogViewerLevel[]
  /** Announces new lines politely. Off by default: a busy log is noise for screen readers. */
  live?: boolean
  labels?: LogViewerLabels
}

const LEVELS: LogViewerLevel[] = ["debug", "info", "warn", "error"]

const pad = (n: number) => String(n).padStart(2, "0")
const clock = (time: string | Date | undefined) =>
  time instanceof Date
    ? `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`
    : (time ?? "")

/* Night paper; warn and error rows add a tinted fill and an edge, and every row names its level. */
const ROW_TONE: Record<LogViewerLevel, string> = {
  debug: "border-transparent",
  info: "border-transparent",
  warn: "border-kg-warning bg-[color-mix(in_oklab,var(--kg-warning)_12%,transparent)]",
  error: "border-kg-danger bg-[color-mix(in_oklab,var(--kg-danger)_14%,transparent)]",
}
const LEVEL_INK: Record<LogViewerLevel, string> = {
  debug: "text-kg-fg-faint",
  info: "text-[color-mix(in_oklab,var(--kg-info)_85%,var(--kg-fg))]",
  warn: "text-[color-mix(in_oklab,var(--kg-warning)_85%,var(--kg-fg))]",
  error: "text-[color-mix(in_oklab,var(--kg-danger)_85%,var(--kg-fg))]",
}
const FILTER_TONE: Record<LogViewerLevel, string> = {
  debug: "[--_tone:var(--kg-fg-faint)]",
  info: "[--_tone:var(--kg-info)]",
  warn: "[--_tone:var(--kg-warning)]",
  error: "[--_tone:var(--kg-danger)]",
}

/** A windowed log stream with level filters, search highlighting and tail-follow. */
export const LogViewer = forwardRef<HTMLDivElement, LogViewerProps>(
  (
    {
      entries,
      height = 320,
      rowHeight = 24,
      follow = true,
      hideToolbar = false,
      defaultLevels = LEVELS,
      live = false,
      labels,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const words = {
      search: "Filter logs",
      levels: "Levels",
      latest: "Jump to latest",
      empty: "No matching lines",
      ...labels,
    }
    const [levels, setLevels] = useState<Set<LogViewerLevel>>(() => new Set(defaultLevels))
    const [query, setQuery] = useState("")
    const scrollRef = useRef<HTMLDivElement>(null)
    const atBottom = useRef(true)
    const [behind, setBehind] = useState(false)
    const searchId = useId()

    const counts = useMemo(() => {
      const map: Record<LogViewerLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 }
      for (const entry of entries) map[entry.level]++
      return map
    }, [entries])

    const visible = useMemo(() => {
      const needle = query.trim().toLowerCase()
      return entries.filter(
        (entry) =>
          levels.has(entry.level) &&
          (!needle ||
            entry.message.toLowerCase().includes(needle) ||
            entry.source?.toLowerCase().includes(needle)),
      )
    }, [entries, levels, query])

    const range = useVirtualWindow(scrollRef, visible.length, rowHeight, 8, height)

    useEffect(() => {
      const node = scrollRef.current
      if (!node) return
      const onScroll = () => {
        atBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < rowHeight
        if (atBottom.current) setBehind(false)
      }
      node.addEventListener("scroll", onScroll, { passive: true })
      return () => node.removeEventListener("scroll", onScroll)
    }, [rowHeight])

    useEffect(() => {
      const node = scrollRef.current
      if (!node || !follow) return
      if (atBottom.current) node.scrollTop = node.scrollHeight
      else setBehind(true)
    }, [visible.length, follow])

    const toggle = (level: LogViewerLevel) =>
      setLevels((current) => {
        const next = new Set(current)
        if (next.has(level)) next.delete(level)
        else next.add(level)
        return next
      })

    const rows = []
    const end = Math.min(range.end, visible.length)
    for (let index = range.start; index < end; index++) {
      const entry = visible[index] as LogViewerEntry
      rows.push(
        <div
          key={entry.id ?? index}
          className={cx(
            "kg-log-viewer__row flex items-center gap-3 border-s-[3px] px-3 leading-(--_row) whitespace-nowrap hover:bg-kg-muted",
            ROW_TONE[entry.level],
          )}
          data-level={entry.level}
          role="listitem"
          aria-setsize={visible.length}
          aria-posinset={index + 1}
          style={{ height: rowHeight }}
        >
          <span className="kg-log-viewer__time flex-none text-kg-fg-faint tabular-nums">{clock(entry.time)}</span>
          <span className={`kg-log-viewer__level w-13 flex-none text-[0.6875rem] font-semibold tracking-[0.04em] uppercase ${LEVEL_INK[entry.level]}`}>{entry.level}</span>
          {entry.source && <span className="kg-log-viewer__source flex-none text-kg-fg-muted">{entry.source}</span>}
          <span className="kg-log-viewer__message min-w-0 overflow-hidden text-ellipsis text-kg-fg" title={entry.message}>
            <Highlight query={query}>{entry.message}</Highlight>
          </span>
        </div>,
      )
    }

    return (
      <div
        ref={ref}
        className={cx(
          "kg-log-viewer relative grid min-w-0 overflow-hidden rounded-kg-xl border-2 border-kg-ink bg-kg-bg shadow-kg-sm",
          className,
        )}
        style={{ "--_row": `${rowHeight}px`, ...style } as CSSProperties}
        {...props}
      >
        {!hideToolbar && (
          <div
            data-theme="dark"
            className="kg-log-viewer__toolbar flex flex-wrap items-center justify-between gap-2 border-b-2 border-kg-border bg-kg-surface p-1.5"
          >
            <div className="kg-log-viewer__levels flex gap-1" role="group" aria-label={words.levels}>
              {LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={cx(
                    "kg-log-viewer__filter inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2 font-kg-mono text-kg-xs transition-colors duration-(--kg-duration-fast) ease-kg-out",
                    "before:size-1.5 before:rounded-full before:bg-(--_tone) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
                    FILTER_TONE[level],
                    levels.has(level)
                      ? "border-kg-ink bg-kg-muted text-kg-fg"
                      : "border-kg-border bg-transparent text-kg-fg-muted line-through decoration-kg-fg-faint",
                  )}
                  data-level={level}
                  aria-pressed={levels.has(level)}
                  onClick={() => toggle(level)}
                >
                  {level}{" "}
                  <span className="kg-log-viewer__count text-kg-fg-faint tabular-nums">{counts[level]}</span>
                </button>
              ))}
            </div>
            <label
              className="kg-log-viewer__search inline-flex h-7 items-center gap-1.5 rounded-kg-md border border-kg-border bg-kg-surface-sunken px-2 text-kg-fg-faint focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-kg-ring [&_svg]:size-3.5 [&_svg]:flex-none"
              htmlFor={searchId}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                id={searchId}
                className="w-40 min-w-0 border-0 bg-transparent text-kg-xs text-kg-fg outline-0 [font:inherit] placeholder:text-kg-fg-faint"
                type="search"
                placeholder={words.search}
                aria-label={words.search}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>
        )}
        <div
          ref={scrollRef}
          data-theme="dark"
          className="kg-log-viewer__scroll relative overflow-auto overscroll-contain bg-kg-bg font-kg-mono text-kg-xs text-kg-fg [scrollbar-width:thin] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kg-ring"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: the scroll region must be keyboard reachable.
          tabIndex={0}
          style={{ height }}
        >
          <div
            role="log"
            aria-live={live ? "polite" : "off"}
            className="kg-log-viewer__spacer relative min-w-full"
            style={{ height: range.total }}
          >
            <div role="list" className="kg-log-viewer__window absolute inset-x-0 top-0" style={{ transform: `translateY(${range.offset}px)` }}>
              {rows}
            </div>
          </div>
          {visible.length === 0 && <p className="kg-log-viewer__empty absolute inset-0 m-0 grid place-items-center text-kg-fg-muted">{words.empty}</p>}
        </div>
        {behind && (
          <button
            type="button"
            data-theme="dark"
            className="kg-log-viewer__latest absolute end-3 bottom-3 inline-flex h-[1.875rem] cursor-pointer items-center gap-1.5 rounded-full border-2 border-kg-accent bg-kg-accent px-3 text-kg-xs font-semibold text-kg-accent-fg shadow-kg-sm transition-[opacity,translate,scale] duration-(--kg-duration-spring) ease-kg-spring starting:translate-y-1.5 starting:scale-92 starting:opacity-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring [&_svg]:size-3.5"
            onClick={() => {
              const node = scrollRef.current
              if (node) node.scrollTop = node.scrollHeight
              atBottom.current = true
              setBehind(false)
            }}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 3v10M4 9l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {words.latest}
          </button>
        )}
      </div>
    )
  },
)
LogViewer.displayName = "LogViewer"
