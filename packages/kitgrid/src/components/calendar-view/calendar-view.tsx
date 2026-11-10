"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"

export type CalendarViewMode = "month" | "agenda"
export type CalendarViewTone = "accent" | "neutral" | "success" | "warning" | "danger" | "info"

export interface CalendarViewEvent {
  id: string
  title: string
  start: Date | string
  /** Defaults to `start`. Multi-day events appear on every day they cover. */
  end?: Date | string
  allDay?: boolean
  tone?: CalendarViewTone
}

export interface CalendarViewLabels {
  previous?: string
  next?: string
  today?: string
  more?: (count: number) => string
  empty?: string
  views?: { month?: string; agenda?: string; label?: string }
}

export interface CalendarViewProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  events: CalendarViewEvent[]
  /** Any day in the month (or week, for agenda) on screen. */
  date?: Date
  defaultDate?: Date
  onDateChange?: (date: Date) => void
  view?: CalendarViewMode
  defaultView?: CalendarViewMode
  onViewChange?: (view: CalendarViewMode) => void
  /** 0 = Sunday, 1 = Monday. */
  weekStartsOn?: 0 | 1
  locale?: string
  /** Events shown per day cell before collapsing into “+N”. */
  maxEventsPerDay?: number
  onEventClick?: (event: CalendarViewEvent) => void
  onDayClick?: (day: Date) => void
  /** Overrides “today”, for deterministic rendering. Without it the server render and hydration mark no day, and the browser’s today appears after mount. */
  today?: Date
  labels?: CalendarViewLabels
}

/* Paper Layers: events are paper slips with a solid tone edge; narrow calendars show them as bars. */
const EVENT_TONES: Record<CalendarViewTone, string> = {
  accent: "bg-kg-paper-sage [--_edge:var(--kg-ink)]",
  neutral: "bg-kg-muted [--_edge:var(--kg-fg-faint)]",
  success: "bg-kg-paper-sage [--_edge:var(--kg-success)]",
  warning: "bg-kg-paper-butter [--_edge:var(--kg-warning)]",
  danger: "bg-kg-paper-rose [--_edge:var(--kg-danger)]",
  info: "bg-kg-paper-sky [--_edge:var(--kg-info)]",
}

const toolButton =
  "inline-grid h-7 min-w-7 cursor-pointer place-items-center rounded-kg-sm border-0 text-kg-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-kg-ring [&_svg]:size-[0.9375rem]"
const idleButton = "bg-transparent text-kg-fg-muted hover:bg-kg-muted hover:text-kg-fg"
const segment = "m-0 inline-flex gap-0.5 rounded-kg-md border-2 border-kg-ink bg-kg-surface-sunken p-0.5"

const toDate = (value: Date | string) => (value instanceof Date ? value : new Date(value))
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const addMonths = (d: Date, n: number) => {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), last))
}
const noSubscribe = () => () => {}
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const key = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
const weekStart = (d: Date, first: number) => addDays(startOfDay(d), -((d.getDay() - first + 7) % 7))

const Arrow = ({ flip }: { flip?: boolean }) => (
  <svg viewBox="0 0 16 16" aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}>
    <path d="M10 4L6 8l4 4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * A month grid (WAI-ARIA grid: arrows move by day and week, Page Up/Down by month, Home/End to
 * the week's edges) and a week agenda, both fed by one list of events.
 */
export const CalendarView = forwardRef<HTMLDivElement, CalendarViewProps>(
  (
    {
      events,
      date: dateProp,
      defaultDate,
      onDateChange,
      view: viewProp,
      defaultView = "month",
      onViewChange,
      weekStartsOn = 1,
      locale = "en-US",
      maxEventsPerDay = 3,
      onEventClick,
      onDayClick,
      today: todayProp,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const [fixedToday] = useState(() => (todayProp ? startOfDay(todayProp) : null))
    const browserDay = useSyncExternalStore(noSubscribe, () => startOfDay(new Date()).getTime(), () => 0)
    const today = fixedToday ?? (browserDay ? new Date(browserDay) : null)
    const [date, setDate] = useControllableState({
      value: dateProp,
      defaultValue: defaultDate ?? today ?? startOfDay(new Date()),
      onChange: onDateChange,
    })
    const [view, setView] = useControllableState({
      value: viewProp,
      defaultValue: defaultView,
      onChange: onViewChange,
    })
    const [focusDay, setFocusDay] = useState(() => startOfDay(date))
    const shouldFocus = useRef(false)
    const gridRef = useRef<HTMLTableElement>(null)
    const titleId = useId()
    const words = {
      previous: view === "month" ? "Previous month" : "Previous week",
      next: view === "month" ? "Next month" : "Next week",
      today: "Today",
      more: (count: number) => `+${count} more`,
      empty: "Nothing scheduled",
      ...labels,
      views: { month: "Month", agenda: "Week", label: "View", ...labels?.views },
    }

    useEffect(() => {
      if (focusDay.getMonth() !== date.getMonth() || focusDay.getFullYear() !== date.getFullYear())
        setFocusDay(startOfDay(date))
      // biome-ignore lint/correctness/useExhaustiveDependencies: sync only when the shown period changes.
    }, [date.getFullYear(), date.getMonth(), date.getDate()])

    useEffect(() => {
      if (!shouldFocus.current) return
      shouldFocus.current = false
      gridRef.current?.querySelector<HTMLElement>(`[data-day="${key(focusDay)}"]`)?.focus()
    }, [focusDay])

    const byDay = useMemo(() => {
      const map = new Map<string, CalendarViewEvent[]>()
      for (const event of events) {
        const start = startOfDay(toDate(event.start))
        const end = startOfDay(toDate(event.end ?? event.start))
        for (let d = start, guard = 0; d <= end && guard < 366; d = addDays(d, 1), guard++) {
          const list = map.get(key(d)) ?? []
          list.push(event)
          map.set(key(d), list)
        }
      }
      for (const list of map.values())
        list.sort((a, b) => Number(!a.allDay) - Number(!b.allDay) || toDate(a.start).getTime() - toDate(b.start).getTime())
      return map
    }, [events])

    const monthTitle = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date)
    const weekdayFormat = new Intl.DateTimeFormat(locale, { weekday: "short" })
    const weekdayLong = new Intl.DateTimeFormat(locale, { weekday: "long" })
    const dayLabel = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric" })
    const timeFormat = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" })

    const gridStart = weekStart(new Date(date.getFullYear(), date.getMonth(), 1), weekStartsOn)
    const weeks: Date[][] = []
    for (let w = 0; w < 6; w++) {
      const row = Array.from({ length: 7 }, (_, d) => addDays(gridStart, w * 7 + d))
      if (w > 3 && (row[0] as Date).getMonth() !== date.getMonth()) break
      weeks.push(row)
    }
    const agendaStart = weekStart(date, weekStartsOn)
    const agendaDays = Array.from({ length: 7 }, (_, d) => addDays(agendaStart, d))
    const agendaTitle = `${new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(agendaStart)} - ${new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(addDays(agendaStart, 6))}`

    const step = (direction: number) =>
      setDate(view === "month" ? addMonths(date, direction) : addDays(date, direction * 7))

    const moveFocus = (next: Date) => {
      shouldFocus.current = true
      setFocusDay(next)
      if (next.getMonth() !== date.getMonth() || next.getFullYear() !== date.getFullYear()) setDate(next)
    }

    const onGridKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
      const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
      const offset = (focusDay.getDay() - weekStartsOn + 7) % 7
      const moves: Record<string, () => Date> = {
        ArrowRight: () => addDays(focusDay, rtl ? -1 : 1),
        ArrowLeft: () => addDays(focusDay, rtl ? 1 : -1),
        ArrowDown: () => addDays(focusDay, 7),
        ArrowUp: () => addDays(focusDay, -7),
        Home: () => addDays(focusDay, -offset),
        End: () => addDays(focusDay, 6 - offset),
        PageUp: () => (event.shiftKey ? addMonths(focusDay, -12) : addMonths(focusDay, -1)),
        PageDown: () => (event.shiftKey ? addMonths(focusDay, 12) : addMonths(focusDay, 1)),
      }
      const move = moves[event.key]
      if (move) {
        event.preventDefault()
        moveFocus(move())
      } else if (event.key === "Enter" || event.key === " ") {
        if ((event.target as HTMLElement).dataset.day) {
          event.preventDefault()
          onDayClick?.(focusDay)
        }
      }
    }

    const timeOf = (event: CalendarViewEvent) =>
      event.allDay ? null : timeFormat.format(toDate(event.start))

    const eventButton = (event: CalendarViewEvent, compact: boolean) => (
      <button
        key={event.id}
        type="button"
        tabIndex={compact ? -1 : 0}
        className={cx(
          "kg-calendar-view__event flex min-w-0 cursor-pointer items-baseline gap-[0.3125rem] border-0 border-s-[3px] border-(--_edge) text-start text-kg-fg",
          "transition-[translate] duration-(--kg-duration-fast) ease-kg-out hover:translate-x-px focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-kg-ring",
          EVENT_TONES[event.tone ?? "accent"],
          compact
            ? "rounded-kg-xs px-1.5 py-px text-[0.6875rem] leading-normal @max-[34rem]:h-[0.3125rem] @max-[34rem]:rounded-full @max-[34rem]:border-s-0 @max-[34rem]:bg-(--_edge) @max-[34rem]:p-0"
            : "w-full rounded-kg-md px-2.5 py-1.5 text-kg-sm",
        )}
        data-tone={event.tone ?? "accent"}
        data-all-day={event.allDay || undefined}
        onClick={(e) => {
          e.stopPropagation()
          onEventClick?.(event)
        }}
      >
        {timeOf(event) && (
          <span className="kg-calendar-view__event-time flex-none tabular-nums @max-[34rem]:hidden">
            {timeOf(event)}
          </span>
        )}
        <span className="kg-calendar-view__event-title min-w-0 overflow-hidden font-semibold text-ellipsis whitespace-nowrap @max-[34rem]:hidden">
          {event.title}
        </span>
      </button>
    )

    return (
      <div ref={ref} className={cx(
          "kg-calendar-view @container grid min-w-0 gap-3 rounded-kg-xl border-2 border-kg-ink bg-kg-surface p-3 text-kg-fg shadow-kg-sm",
          className,
        )} data-view={view} {...props}>
        <div className="kg-calendar-view__toolbar flex flex-wrap items-center gap-2">
          <h2 id={titleId} className="kg-calendar-view__title m-0 flex-1 text-kg-lg font-bold tracking-[-0.015em]" aria-live="polite">
            {view === "month" ? monthTitle : agendaTitle}
          </h2>
          <div className={`kg-calendar-view__nav ${segment}`}>
            <button type="button" className={`kg-calendar-view__button ${toolButton} ${idleButton} px-1.5`} aria-label={words.previous} onClick={() => step(-1)}>
              <Arrow />
            </button>
            <button
              type="button"
              className={`kg-calendar-view__button ${toolButton} ${idleButton} px-2.5`}
              data-wide=""
              onClick={() => {
                const now = today ?? startOfDay(new Date())
                setDate(now)
                setFocusDay(now)
              }}
            >
              {words.today}
            </button>
            <button type="button" className={`kg-calendar-view__button ${toolButton} ${idleButton} px-1.5`} aria-label={words.next} onClick={() => step(1)}>
              <Arrow flip />
            </button>
          </div>
          <div className={`kg-calendar-view__views ${segment}`} role="group" aria-label={words.views.label}>
            {(["month", "agenda"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view === mode}
                className={cx(
                  "kg-calendar-view__view",
                  toolButton,
                  "px-1.5",
                  view === mode
                    ? "bg-kg-surface text-kg-fg shadow-[0_0_0_1.5px_var(--kg-ink)]"
                    : idleButton,
                )}
                onClick={() => setView(mode)}
              >
                {words.views[mode]}
              </button>
            ))}
          </div>
        </div>

        {view === "month" ? (
          <table
            ref={gridRef}
            role="grid"
            aria-labelledby={titleId}
            className="kg-calendar-view__grid w-full table-fixed border-separate border-spacing-0 overflow-hidden rounded-kg-lg border-2 border-kg-ink"
            onKeyDown={onGridKeyDown}
          >
            <thead>
              <tr>
                {(weeks[0] ?? []).map((day) => (
                  <th key={day.getDay()} scope="col" abbr={weekdayLong.format(day)} className="kg-calendar-view__weekday border-b border-kg-ink/25 bg-kg-surface-sunken p-2 text-start text-kg-xs font-semibold text-kg-fg-muted">
                    {weekdayFormat.format(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={key(week[0] as Date)}>
                  {week.map((day) => {
                    const list = byDay.get(key(day)) ?? []
                    const outside = day.getMonth() !== date.getMonth()
                    const isToday = today !== null && sameDay(day, today)
                    const focusable = sameDay(day, focusDay)
                    const shown = list.slice(0, maxEventsPerDay)
                    const extra = list.length - shown.length
                    return (
                      <td
                        key={key(day)}
                        role="gridcell"
                        tabIndex={focusable ? 0 : -1}
                        data-day={key(day)}
                        data-outside={outside || undefined}
                        data-today={isToday || undefined}
                        aria-current={isToday ? "date" : undefined}
                        aria-label={`${dayLabel.format(day)}${list.length ? `, ${list.length} ${list.length === 1 ? "event" : "events"}` : ""}`}
                        className={cx(
                          "kg-calendar-view__day relative h-25 cursor-pointer border-e border-b border-kg-ink/25 p-1.5 align-top outline-none transition-colors duration-(--kg-duration-fast) ease-kg-out last:border-e-0 focus-visible:inset-ring-2 focus-visible:inset-ring-kg-ring @max-[34rem]:h-14 [tr:last-child>&]:border-b-0",
                          outside ? "bg-kg-surface-sunken" : "hover:bg-kg-muted",
                        )}
                        onClick={() => {
                          setFocusDay(day)
                          onDayClick?.(day)
                        }}
                        onFocus={(event) => {
                          if (event.target === event.currentTarget && !sameDay(day, focusDay)) setFocusDay(day)
                        }}
                      >
                        <span
                          className={cx(
                            "kg-calendar-view__date mb-1 inline-grid h-6 min-w-6 place-items-center rounded-full px-1 text-kg-xs font-semibold tabular-nums",
                            isToday ? "bg-kg-accent text-kg-accent-fg" : outside && "text-kg-fg-muted",
                          )}
                          aria-hidden="true"
                        >
                          {day.getDate()}
                        </span>
                        <span className="kg-calendar-view__events grid min-w-0 gap-[0.1875rem]">
                          {shown.map((event) => eventButton(event, true))}
                          {extra > 0 && <span className="kg-calendar-view__more px-1.5 text-[0.6875rem] font-semibold text-kg-fg-muted">{words.more(extra)}</span>}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <ol className="kg-calendar-view__agenda m-0 grid list-none p-0" aria-labelledby={titleId}>
            {agendaDays.map((day) => {
              const list = byDay.get(key(day)) ?? []
              const isToday = today !== null && sameDay(day, today)
              return (
                <li key={key(day)} className="kg-calendar-view__agenda-day grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-3 py-2.5 [&+&]:border-t [&+&]:border-kg-ink/25" data-today={isToday || undefined}>
                  <div className="kg-calendar-view__agenda-date grid justify-items-center leading-[1.1]" aria-current={isToday ? "date" : undefined}>
                    <span className="kg-calendar-view__agenda-weekday text-kg-xs tracking-[0.04em] text-kg-fg-muted uppercase">{weekdayFormat.format(day)}</span>
                    <span
                      className={cx(
                        "kg-calendar-view__agenda-number grid size-8 place-items-center rounded-full text-kg-md font-bold tabular-nums",
                        isToday && "bg-kg-accent text-kg-accent-fg",
                      )}
                    >{day.getDate()}</span>
                  </div>
                  {list.length ? (
                    <ul className="kg-calendar-view__agenda-list m-0 grid list-none gap-1.5 p-0">
                      {list.map((event) => (
                        <li key={event.id}>
                          {eventButton(event, false)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="kg-calendar-view__agenda-empty pt-2 text-kg-sm text-kg-fg-muted">{words.empty}</span>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    )
  },
)
CalendarView.displayName = "CalendarView"
