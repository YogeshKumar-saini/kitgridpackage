"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { useLocale } from "../../hooks/use-locale.js"
import { ChevronLeftIcon, ChevronRightIcon } from "../combobox/internal.js"
import {
  addDays,
  addMonths,
  clampDay,
  dayOfWeek,
  formatDay,
  isValidDay,
  localeWeekStart,
  localToday,
  monthGrid,
  sameMonth,
  startOfMonth,
} from "./dates.js"

/** Both ends as `yyyy-mm-dd`, inclusive and in order. */
export interface CalendarRange {
  start: string
  end: string
}

export interface CalendarLabels {
  previous: string
  next: string
}

interface CalendarBaseProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** Earliest selectable day, `yyyy-mm-dd`. */
  min?: string
  /** Latest selectable day, `yyyy-mm-dd`. */
  max?: string
  isDateDisabled?: (day: string) => boolean
  /** BCP 47 locale for month and weekday names. Defaults to the user's. */
  locale?: string
  /** 0 is Sunday. Defaults to the locale's first day. */
  weekStartsOn?: number
  /** Months shown side by side. */
  months?: 1 | 2
  /** Any day in the first visible month. */
  month?: string
  defaultMonth?: string
  onMonthChange?: (month: string) => void
  /** Overrides the local date, mostly for tests and demos. */
  today?: string
  labels?: Partial<CalendarLabels>
  /** Moves focus to the selected (or today's) day on mount, e.g. inside a popover. */
  autoFocus?: boolean
}

export interface CalendarSingleProps extends CalendarBaseProps {
  mode?: "single"
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string) => void
}

export interface CalendarRangeProps extends CalendarBaseProps {
  mode: "range"
  value?: CalendarRange | null
  defaultValue?: CalendarRange | null
  /** Called once both ends are picked. */
  onValueChange?: (value: CalendarRange) => void
}

export type CalendarProps = CalendarSingleProps | CalendarRangeProps

const defaultLabels: CalendarLabels = { previous: "Previous month", next: "Next month" }

const navClass = cx(
  "kg-calendar__nav inline-grid place-items-center size-8 p-0 shrink-0 cursor-pointer",
  "rounded-kg-md border-2 border-transparent bg-transparent text-kg-fg-muted [&_svg]:size-4",
  "transition-[background-color,border-color,color,scale] duration-(--kg-duration-fast) ease-kg-out",
  "interactive:hover:bg-kg-muted interactive:hover:border-kg-ink interactive:hover:text-kg-fg interactive:active:scale-92",
  "disabled:cursor-not-allowed disabled:opacity-35",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
)

/* The band behind a range runs edge to edge and rounds only at the row's ends. */
const cellClass = cx(
  "kg-calendar__cell relative px-0 py-px",
  "data-in-range:before:absolute data-in-range:before:inset-y-px data-in-range:before:inset-x-0 data-in-range:before:bg-kg-paper-sage",
  "data-in-range:data-range-start:before:start-1/2 data-in-range:data-range-end:before:end-1/2",
  "first:data-in-range:before:rounded-s-kg-md last:data-in-range:before:rounded-e-kg-md",
)

const dayClass = cx(
  "kg-calendar__day relative grid place-items-center size-(--_cell) p-0 border-0 rounded-kg-md",
  "bg-transparent [font:inherit] tabular-nums text-inherit cursor-pointer",
  "transition-[background-color,color,scale] duration-(--kg-duration-fast) ease-kg-out",
  "not-data-selected:interactive:hover:bg-kg-muted interactive:active:scale-90",
  "focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
  "not-data-selected:data-outside:text-kg-fg-muted",
  "data-selected:bg-kg-accent data-selected:text-kg-accent-fg data-selected:font-semibold",
  // Today gets an ink underline in the day's own colour, so it reads on a selected day too.
  "data-today:font-semibold data-today:after:absolute data-today:after:bottom-1 data-today:after:left-1/2 data-today:after:w-3 data-today:after:h-0.5",
  "data-today:after:-translate-x-1/2 data-today:after:rounded-full data-today:after:bg-current",
  "aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:line-through",
)

/**
 * A month grid following the APG date picker pattern: one tab stop, arrows move by day and
 * week, Page keys by month (Shift for year), Home and End to the week's edges.
 */
export const Calendar = forwardRef<HTMLDivElement, CalendarProps>((props, ref) => {
  const {
    mode = "single",
    value: valueProp,
    defaultValue = null,
    onValueChange,
    min,
    max,
    isDateDisabled,
    locale: localeProp,
    weekStartsOn: weekStartsOnProp,
    months = 1,
    month: monthProp,
    defaultMonth,
    onMonthChange,
    today: todayProp,
    labels: labelsProp,
    autoFocus = false,
    className,
    ...rest
  } = props
  const locale = useLocale(localeProp)
  const labels = { ...defaultLabels, ...labelsProp }
  const [today] = useState(() => todayProp ?? localToday())
  const weekStartsOn = weekStartsOnProp ?? localeWeekStart(locale)

  const [value, setValue] = useControllableState<string | CalendarRange | null>({
    value: valueProp,
    defaultValue,
    onChange: onValueChange as ((value: string | CalendarRange | null) => void) | undefined,
  })
  const single = mode === "single" && typeof value === "string" ? value : null
  const range = mode === "range" && value && typeof value === "object" ? value : null
  const anchorDay = single ?? range?.start ?? null

  const [visible, setVisible] = useControllableState({
    value: monthProp ? startOfMonth(monthProp) : undefined,
    defaultValue: startOfMonth(defaultMonth ?? anchorDay ?? clampDay(today, min, max)),
    onChange: onMonthChange,
  })
  const [focused, setFocused] = useState(() =>
    clampDay(anchorDay && isValidDay(anchorDay) ? anchorDay : today, min, max),
  )
  const [pendingStart, setPendingStart] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [direction, setDirection] = useState<1 | -1>(1)
  const gridRef = useRef<HTMLDivElement>(null)
  const moveFocus = useRef(false)
  const baseId = useId()

  const lastVisible = addMonths(visible, months - 1)
  const isOutOfRange = (day: string) => Boolean((min && day < min) || (max && day > max))
  const isDisabled = (day: string) => isOutOfRange(day) || Boolean(isDateDisabled?.(day))

  // Keep the roving tab stop inside the visible months.
  const tabStop =
    focused >= visible && startOfMonth(focused) <= lastVisible ? focused : visible

  useEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focused}"]`)?.focus()
  }, [focused, visible])

  useEffect(() => {
    if (!autoFocus) return
    gridRef.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus()
  }, [autoFocus])

  const showMonth = (month: string) => {
    const next = startOfMonth(month)
    if (next === visible) return
    setDirection(next > visible ? 1 : -1)
    setVisible(next)
  }

  const goTo = (day: string) => {
    const next = clampDay(day, min, max)
    moveFocus.current = true
    setFocused(next)
    if (next < visible) showMonth(next)
    else if (startOfMonth(next) > lastVisible) showMonth(addMonths(next, -(months - 1)))
    if (pendingStart) setHovered(next)
  }

  const select = (day: string) => {
    if (isDisabled(day)) return
    setFocused(day)
    if (!sameMonth(day, visible) && !sameMonth(day, lastVisible)) {
      moveFocus.current = true
      showMonth(day < visible ? day : addMonths(day, -(months - 1)))
    }
    if (mode === "single") {
      setValue(day)
      return
    }
    if (!pendingStart) {
      setPendingStart(day)
      setHovered(day)
      return
    }
    const [start, end] = pendingStart <= day ? [pendingStart, day] : [day, pendingStart]
    setPendingStart(null)
    setHovered(null)
    setValue({ start, end })
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (!target.dataset.day) return
    const shift = event.shiftKey ? 12 : 1
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focused, rtl ? 1 : -1),
      ArrowRight: () => addDays(focused, rtl ? -1 : 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => addDays(focused, -((dayOfWeek(focused) - weekStartsOn + 7) % 7)),
      End: () => addDays(focused, 6 - ((dayOfWeek(focused) - weekStartsOn + 7) % 7)),
      PageUp: () => addMonths(focused, -shift),
      PageDown: () => addMonths(focused, shift),
    }
    const move = moves[event.key]
    if (move) {
      event.preventDefault()
      goTo(move())
    } else if (event.key === "Escape" && pendingStart) {
      event.preventDefault()
      setPendingStart(null)
      setHovered(null)
    }
  }

  const weekdays = useMemo(
    () =>
      // 2023-01-01 was a Sunday.
      Array.from({ length: 7 }, (_, index) => {
        const day = addDays("2023-01-01", (index + weekStartsOn) % 7)
        return {
          short: formatDay(day, locale, { weekday: "narrow" }),
          long: formatDay(day, locale, { weekday: "long" }),
        }
      }),
    [locale, weekStartsOn],
  )

  const previewEnd = pendingStart ? (hovered ?? pendingStart) : null
  const rangeStart = pendingStart
    ? previewEnd && previewEnd < pendingStart
      ? previewEnd
      : pendingStart
    : range?.start
  const rangeEnd = pendingStart
    ? previewEnd && previewEnd < pendingStart
      ? pendingStart
      : previewEnd
    : range?.end

  const monthList = Array.from({ length: months }, (_, index) => addMonths(visible, index))
  const prevDisabled = Boolean(min && addDays(visible, -1) < min)
  const nextDisabled = Boolean(max && addMonths(lastVisible, 1) > max)

  return (
    <div
      ref={ref}
      className={cx(
        "kg-calendar inline-grid gap-2 p-3 [--_cell:2.25rem] text-kg-sm text-kg-fg select-none",
        "rounded-kg-lg border-2 border-kg-ink bg-kg-surface shadow-kg-sm [[role=dialog]>&]:shadow-kg-md",
        className,
      )}
      data-mode={mode}
      data-months={months}
      data-picking={pendingStart ? "" : undefined}
      {...rest}
    >
      <div className="kg-calendar__header flex items-center gap-1">
        <button
          type="button"
          className={navClass}
          aria-label={labels.previous}
          disabled={prevDisabled}
          onClick={() => showMonth(addMonths(visible, -1))}
        >
          <ChevronLeftIcon />
        </button>
        <div className="kg-calendar__titles grid grid-flow-col auto-cols-fr flex-1 gap-6" aria-live="polite">
          {monthList.map((month, index) => (
            <h2 key={month} id={`${baseId}-title-${index}`} className="kg-calendar__title m-0 text-kg-sm font-semibold text-center tracking-[-0.005em]">
              {formatDay(month, locale, { month: "long", year: "numeric" })}
            </h2>
          ))}
        </div>
        <button
          type="button"
          className={navClass}
          aria-label={labels.next}
          disabled={nextDisabled}
          onClick={() => showMonth(addMonths(visible, 1))}
        >
          <ChevronRightIcon />
        </button>
      </div>
      <div
        ref={gridRef}
        className="kg-calendar__months grid grid-flow-col items-start gap-6"
        onKeyDown={handleKeyDown}
        onPointerLeave={() => pendingStart && setHovered(null)}
      >
        {monthList.map((month, index) => (
          <table
            key={month}
            role="grid"
            aria-labelledby={`${baseId}-title-${index}`}
            className={cx(
              "kg-calendar__grid border-collapse border-spacing-0",
              "transition-[opacity,translate] duration-(--kg-duration-base) ease-kg-out motion-reduce:transition-none",
              "starting:opacity-0 data-[direction=next]:starting:translate-x-2 data-[direction=previous]:starting:-translate-x-2",
            )}
            data-direction={direction > 0 ? "next" : "previous"}
          >
            <thead>
              <tr>
                {weekdays.map((weekday) => (
                  <th
                    key={weekday.long}
                    scope="col"
                    abbr={weekday.long}
                    className="kg-calendar__weekday w-(--_cell) h-7 p-0 text-kg-xs font-medium text-kg-fg-muted"
                  >
                    {weekday.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthGrid(month, weekStartsOn).map((week) => (
                <tr key={week[0]}>
                  {week.map((day) => {
                    const outside = !sameMonth(day, month)
                    if (outside && months > 1) return <td key={day} role="presentation" />
                    const disabled = isDisabled(day)
                    const selected =
                      single === day ||
                      (rangeStart !== undefined &&
                        rangeEnd !== undefined &&
                        rangeEnd !== null &&
                        day >= rangeStart &&
                        day <= rangeEnd)
                    return (
                      <td
                        key={day}
                        role="gridcell"
                        aria-selected={selected || undefined}
                        className={cellClass}
                        data-range-start={rangeStart === day || undefined}
                        data-range-end={rangeEnd === day || undefined}
                        data-in-range={
                          (mode === "range" && selected && rangeStart !== rangeEnd) ||
                          undefined
                        }
                      >
                        <button
                          type="button"
                          tabIndex={day === tabStop && !outside ? 0 : -1}
                          data-day={day}
                          className={dayClass}
                          data-today={day === today || undefined}
                          data-outside={outside || undefined}
                          data-selected={
                            single === day || rangeStart === day || rangeEnd === day || undefined
                          }
                          aria-disabled={disabled || undefined}
                          aria-current={day === today ? "date" : undefined}
                          aria-label={formatDay(day, locale, { dateStyle: "full" })}
                          onClick={() => select(day)}
                          onFocus={() => {
                            if (focused !== day) setFocused(day)
                          }}
                          onPointerEnter={() => pendingStart && setHovered(day)}
                        >
                          {Number(day.slice(8))}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    </div>
  )
})

Calendar.displayName = "Calendar"
