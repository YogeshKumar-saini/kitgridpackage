"use client"

import { forwardRef, type HTMLAttributes, useState } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { DateInput } from "../date-input/date-input.js"
import type { InputSize } from "../input/input.js"

/** Both ends as `yyyy-mm-dd`, inclusive. */
export interface DateRangePickerValue {
  start: string
  end: string
}

export interface DateRangePickerPreset {
  label: string
  /** Builds the range from today's date (`yyyy-mm-dd`). */
  range: (today: string) => DateRangePickerValue
}

const DAY_MS = 86_400_000

// Dates stay `yyyy-mm-dd` strings read as UTC midnight, so no time zone shifts a day.
const parse = (day: string) => new Date(`${day}T00:00:00Z`)
const iso = (date: Date) => date.toISOString().slice(0, 10)
const shiftDays = (day: string, days: number) =>
  iso(new Date(parse(day).getTime() + days * DAY_MS))
const monthStart = (day: string, offset = 0) => {
  const date = parse(day)
  return iso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1)))
}
const localToday = () => {
  const now = new Date()
  return iso(new Date(now.getTime() - now.getTimezoneOffset() * 60_000))
}

export const dateRangePickerPresets: readonly DateRangePickerPreset[] = [
  {
    label: "Last 7 days",
    range: (today) => ({ start: shiftDays(today, -6), end: today }),
  },
  {
    label: "Last 30 days",
    range: (today) => ({ start: shiftDays(today, -29), end: today }),
  },
  { label: "This month", range: (today) => ({ start: monthStart(today), end: today }) },
  {
    label: "Last month",
    range: (today) => ({
      start: monthStart(today, -1),
      end: shiftDays(monthStart(today), -1),
    }),
  },
  {
    label: "Year to date",
    range: (today) => ({ start: `${today.slice(0, 4)}-01-01`, end: today }),
  },
]

export interface DateRangePickerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  value?: DateRangePickerValue | null
  defaultValue?: DateRangePickerValue | null
  /** Called once both ends are set and in order, or with `null` when cleared. */
  onValueChange?: (value: DateRangePickerValue | null) => void
  min?: string
  max?: string
  /** Quick ranges shown as chips. Pass `[]` for none. */
  presets?: readonly DateRangePickerPreset[]
  /** The date presets count back from. Defaults to the local date. */
  today?: string
  /** Accessible name of the whole control. */
  label?: string
  fromLabel?: string
  toLabel?: string
  size?: InputSize
  disabled?: boolean
}

/* Paper Layers: chips are white sheets; a pressed one fills with ink and gains a mint check. */
const presetClass = (pressed: boolean, small: boolean) =>
  cx(
    "kg-date-range-picker__preset inline-flex items-center gap-1.5 [font-family:inherit] font-medium whitespace-nowrap",
    "border-2 rounded-full cursor-pointer",
    "transition-[color,background-color,border-color,scale] duration-(--kg-duration-fast) ease-kg-out",
    "interactive:active:scale-96 disabled:cursor-not-allowed disabled:opacity-45",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
    small ? "h-[1.625rem] px-2.5 text-kg-xs" : "h-[1.875rem] px-3 text-kg-sm",
    pressed
      ? cx(
          "text-kg-accent-fg bg-kg-accent border-kg-accent",
          "before:w-[0.4rem] before:h-[0.7rem] before:-mt-[0.15rem] before:rotate-45",
          "before:border-solid before:border-current before:border-t-0 before:border-s-0 before:border-e-2 before:border-b-2",
          "before:animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)]",
        )
      : "text-kg-fg-muted bg-kg-surface border-kg-border interactive:hover:text-kg-fg interactive:hover:border-kg-ink",
  )

const same = (a: DateRangePickerValue | null, b: DateRangePickerValue | null) =>
  a?.start === b?.start && a?.end === b?.end

/**
 * Two native date fields and one-tap presets. Typing a date never emits a half-finished or
 * backwards range: a change is reported only once both ends are set and in order.
 */
export const DateRangePicker = forwardRef<HTMLDivElement, DateRangePickerProps>(
  (
    {
      value: valueProp,
      defaultValue = null,
      onValueChange,
      min,
      max,
      presets = dateRangePickerPresets,
      today: todayProp,
      label = "Date range",
      fromLabel = "From",
      toLabel = "To",
      size = "md",
      disabled = false,
      className,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllableState<DateRangePickerValue | null>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const [draft, setDraft] = useState({
      start: value?.start ?? "",
      end: value?.end ?? "",
    })
    // A preset, a reset or the parent moves the range; the fields follow it.
    const [seen, setSeen] = useState(value)
    if (!same(seen, value)) {
      setSeen(value)
      setDraft({ start: value?.start ?? "", end: value?.end ?? "" })
    }

    const today = todayProp ?? localToday()

    const update = (next: { start: string; end: string }) => {
      setDraft(next)
      if (!next.start && !next.end) setValue(null)
      else if (next.start && next.end && next.start <= next.end) setValue({ ...next })
    }

    return (
      <div
        ref={ref}
        role="group"
        aria-label={label}
        className={cx("kg-date-range-picker grid gap-2.5 min-w-0", className)}
        data-size={size}
        {...props}
      >
        <div className="kg-date-range-picker__fields flex items-center gap-2 min-w-0 [&>.kg-input]:flex-[1_1_0]">
          <DateInput
            aria-label={fromLabel}
            size={size}
            value={draft.start}
            min={min}
            max={draft.end || max}
            disabled={disabled}
            onValueChange={(start) => update({ ...draft, start })}
          />
          <span className="kg-date-range-picker__to shrink-0 text-kg-sm text-kg-fg-muted" aria-hidden="true">
            to
          </span>
          <DateInput
            aria-label={toLabel}
            size={size}
            value={draft.end}
            min={draft.start || min}
            max={max}
            disabled={disabled}
            onValueChange={(end) => update({ ...draft, end })}
          />
        </div>
        {presets.length > 0 && (
          <div className="kg-date-range-picker__presets flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              const range = preset.range(today)
              const outOfBounds =
                (min !== undefined && range.start < min) ||
                (max !== undefined && range.end > max)
              const pressed = same(range, value)
              return (
                <button
                  key={preset.label}
                  type="button"
                  className={presetClass(pressed, size === "sm")}
                  aria-pressed={pressed}
                  disabled={disabled || outOfBounds}
                  onClick={() => setValue(pressed ? null : range)}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  },
)

DateRangePicker.displayName = "DateRangePicker"
