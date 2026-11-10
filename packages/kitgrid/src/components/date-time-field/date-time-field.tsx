"use client"

import {
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { useEventCallback } from "../../hooks/use-event-callback.js"
import { useLocale } from "../../hooks/use-locale.js"
import { Layer } from "../../primitives/layer.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { Calendar } from "../calendar/calendar.js"
import { isValidDay } from "../calendar/dates.js"
import { usePopup } from "../combobox/internal.js"
import { resolveFieldControl, useField } from "../field/field.js"
import { calendarPopupClass } from "../date-picker/date-picker.js"
import {
  type InputGroupSize,
  inputGroupButton,
  inputGroupVariants,
} from "../input-group/input-group.js"
import {
  focusSibling,
  Segment,
  segmentsClass,
  separatorClass,
} from "../time-picker/segment.js"
import { localeHourCycle } from "../time-picker/time-picker.js"

export type DateTimeFieldGranularity = "day" | "minute"

export interface DateTimeFieldLabels {
  year: string
  month: string
  day: string
  hour: string
  minute: string
  period: string
  calendar: string
}

export interface DateTimeFieldProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** `yyyy-mm-ddTHH:mm`, or `yyyy-mm-dd` at day granularity. `null` while incomplete. */
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
  granularity?: DateTimeFieldGranularity
  locale?: string
  hourCycle?: 12 | 24
  /** Bounds for the calendar popup, `yyyy-mm-dd`. */
  min?: string
  max?: string
  /** Adds a button that opens a Calendar for the date part. */
  showCalendar?: boolean
  size?: InputGroupSize
  invalid?: boolean
  disabled?: boolean
  required?: boolean
  labels?: Partial<DateTimeFieldLabels>
  name?: string
  id?: string
}

type Key = "year" | "month" | "day" | "hour" | "minute"
type Parts = Record<Key, number | null>

const defaultLabels: DateTimeFieldLabels = {
  year: "Year",
  month: "Month",
  day: "Day",
  hour: "Hours",
  minute: "Minutes",
  period: "AM/PM",
  calendar: "Open calendar",
}

const empty: Parts = { year: null, month: null, day: null, hour: null, minute: null }

const parse = (value: string | null | undefined): Parts => {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value) : null
  if (!match) return empty
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: match[4] === undefined ? null : Number(match[4]),
    minute: match[5] === undefined ? null : Number(match[5]),
  }
}

const pad = (n: number, size = 2) => String(n).padStart(size, "0")
const daysIn = (year: number | null, month: number | null) =>
  month === null ? 31 : new Date(Date.UTC(year ?? 2024, month, 0)).getUTCDate()

/** The locale's order of day, month and year, with its separators. */
type DatePart = { type: "year" | "month" | "day" } | { literal: string }

const dateOrder = (locale: string): DatePart[] => {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC",
    })
      .formatToParts(new Date(Date.UTC(2026, 10, 25)))
      .flatMap<DatePart>((part) =>
        part.type === "year" || part.type === "month" || part.type === "day"
          ? [{ type: part.type }]
          : part.type === "literal"
            ? [{ literal: part.value }]
            : [],
      )
  } catch {
    return [{ type: "year" }, { literal: "-" }, { type: "month" }, { literal: "-" }, { type: "day" }]
  }
}

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round" />
  </svg>
)

/** Typed date and time segments in the locale's order, plus an optional calendar popup. */
export const DateTimeField = forwardRef<HTMLDivElement, DateTimeFieldProps>(
  (
    {
      value: valueProp,
      defaultValue = null,
      onValueChange,
      granularity = "minute",
      locale: localeProp,
      hourCycle: hourCycleProp,
      min,
      max,
      showCalendar = true,
      size = "md",
      invalid,
      disabled,
      required,
      labels: labelsProp,
      name,
      id,
      className,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "aria-describedby": describedBy,
      ...props
    },
    ref,
  ) => {
    const control = resolveFieldControl(useField(), {
      id,
      disabled,
      required,
      invalid,
      "aria-describedby": describedBy,
    })
    const locale = useLocale(localeProp)
    const labels = { ...defaultLabels, ...labelsProp }
    const withTime = granularity === "minute"
    const twelve = (hourCycleProp ?? localeHourCycle(locale)) === 12
    const order = useMemo(() => dateOrder(locale), [locale])
    const controlled = valueProp !== undefined
    const [parts, setParts] = useState<Parts>(() => parse(valueProp ?? defaultValue))
    const [period, setPeriod] = useState<0 | 1>(() =>
      (parse(valueProp ?? defaultValue).hour ?? 0) >= 12 ? 1 : 0,
    )
    const [open, setOpen] = useState(false)
    const emitted = useRef<string | null>(valueProp ?? defaultValue)
    const emit = useEventCallback(onValueChange)
    const groupRef = useRef<HTMLDivElement>(null)
    const rootRef = useComposedRefs(groupRef, ref)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const dialogId = useId()

    useEffect(() => {
      if (!controlled || valueProp === emitted.current) return
      emitted.current = valueProp
      const next = parse(valueProp)
      setParts(next)
      if (next.hour !== null) setPeriod(next.hour >= 12 ? 1 : 0)
    }, [controlled, valueProp])

    const update = (patch: Partial<Parts>, nextPeriod = period) => {
      const next = { ...parts, ...patch }
      // Shrinks the day when the month or year changes under it (31 → 30 or Feb 29).
      if (next.day !== null) next.day = Math.min(next.day, daysIn(next.year, next.month))
      setParts(next)
      setPeriod(nextPeriod)
      const day =
        next.year !== null && next.month !== null && next.day !== null
          ? `${pad(next.year, 4)}-${pad(next.month)}-${pad(next.day)}`
          : null
      const result = !day
        ? null
        : !withTime
          ? day
          : next.hour !== null && next.minute !== null
            ? `${day}T${pad(next.hour)}:${pad(next.minute)}`
            : null
      if (result !== emitted.current) {
        emitted.current = result
        emit(result)
      }
    }

    const advance = () => {
      const active = document.activeElement
      if (active instanceof HTMLElement && groupRef.current?.contains(active))
        focusSibling(active, 1)
    }

    const close = (refocus = true) => {
      setOpen(false)
      if (refocus) buttonRef.current?.focus()
    }
    const { ref: layerRef, present, state } = usePopup({
      open,
      anchorRef: groupRef,
      onDismiss: () => close(),
      matchWidth: false,
    })

    const common = {
      disabled: control.disabled,
      invalid: control.invalid,
      onFilled: advance,
    }
    const dateSegment = (type: "year" | "month" | "day", first: boolean) => (
      <Segment
        key={type}
        id={first ? control.id : undefined}
        label={labels[type]}
        placeholder={type === "year" ? "yyyy" : type === "month" ? "mm" : "dd"}
        value={parts[type]}
        min={1}
        max={type === "year" ? 9999 : type === "month" ? 12 : daysIn(parts.year, parts.month)}
        display={(v) => pad(v, type === "year" ? 4 : 2)}
        onChange={(v) => update({ [type]: v })}
        {...common}
      />
    )
    const shownHour =
      parts.hour === null ? null : twelve ? parts.hour % 12 || 12 : parts.hour
    const toHour24 = (h: number, p: 0 | 1) => (twelve ? (h % 12) + (p ? 12 : 0) : h)
    const day =
      parts.year !== null && parts.month !== null && parts.day !== null
        ? `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}`
        : null

    let firstDate = true
    return (
      <>
        <div
          ref={rootRef}
          role="group"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy ?? (ariaLabel ? undefined : control.labelId)}
          aria-describedby={control.describedBy}
          className={inputGroupVariants({
            size,
            end: "tight",
            className: cx(
              "kg-date-time-field data-size:w-auto data-size:gap-3 not-data-disabled:cursor-default",
              className,
            ),
          })}
          data-segment-group=""
          data-size={size}
          data-state={open ? "open" : "closed"}
          data-invalid={control.invalid || undefined}
          data-disabled={control.disabled || undefined}
          {...props}
        >
          <span className={segmentsClass}>
            {order.map((part, index) => {
              if ("literal" in part)
                return (
                  <span key={`l${index}`} className={separatorClass} aria-hidden="true">
                    {part.literal}
                  </span>
                )
              const segment = dateSegment(part.type, firstDate)
              firstDate = false
              return segment
            })}
          </span>
          {withTime && (
            <span className={cx(segmentsClass, "kg-date-time-field__time ps-3 border-s border-kg-border")}>
              <Segment
                label={labels.hour}
                placeholder="--"
                value={shownHour}
                min={twelve ? 1 : 0}
                max={twelve ? 12 : 23}
                display={(v) => pad(v)}
                onChange={(h) => update({ hour: h === null ? null : toHour24(h, period) })}
                {...common}
              />
              <span className={separatorClass} aria-hidden="true">
                :
              </span>
              <Segment
                label={labels.minute}
                placeholder="--"
                value={parts.minute}
                min={0}
                max={59}
                display={(v) => pad(v)}
                onChange={(m) => update({ minute: m })}
                {...common}
              />
              {twelve && (
                <Segment
                  label={labels.period}
                  placeholder="AM"
                  value={period}
                  min={0}
                  max={1}
                  display={(p) => (p ? "PM" : "AM")}
                  letters={{ a: 0, p: 1 }}
                  disabled={control.disabled}
                  invalid={control.invalid}
                  onChange={(p) => {
                    const nextPeriod: 0 | 1 = p ? 1 : 0
                    update(
                      {
                        hour:
                          parts.hour === null
                            ? null
                            : toHour24(parts.hour % 12 || 12, nextPeriod),
                      },
                      nextPeriod,
                    )
                  }}
                />
              )}
            </span>
          )}
          {showCalendar && (
            <button
              ref={buttonRef}
              type="button"
              className={cx(inputGroupButton, "kg-date-time-field__calendar [.kg-date-time-field>&]:ms-auto")}
              aria-label={labels.calendar}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls={present ? dialogId : undefined}
              disabled={control.disabled}
              onClick={() => (open ? close() : setOpen(true))}
            >
              <CalendarIcon />
            </button>
          )}
          {name !== undefined && (
            <input type="hidden" name={name} value={emitted.current ?? ""} />
          )}
        </div>
        {present && (
          <Layer
            ref={layerRef}
            id={dialogId}
            role="dialog"
            aria-label={labels.calendar}
            className={cx("kg-date-time-field__popup", calendarPopupClass)}
            data-state={state}
          >
            <Calendar
              autoFocus
              locale={locale}
              min={min}
              max={max}
              value={day && isValidDay(day) ? day : null}
              onValueChange={(picked) => {
                update({
                  year: Number(picked.slice(0, 4)),
                  month: Number(picked.slice(5, 7)),
                  day: Number(picked.slice(8, 10)),
                })
                close()
              }}
            />
          </Layer>
        )}
      </>
    )
  },
)

DateTimeField.displayName = "DateTimeField"
