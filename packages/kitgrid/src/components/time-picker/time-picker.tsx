"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useEffect, useRef, useState } from "react"
import { useEventCallback } from "../../hooks/use-event-callback.js"
import { useLocale } from "../../hooks/use-locale.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { resolveFieldControl, useField } from "../field/field.js"
import {
  type InputGroupSize,
  inputGroupAddon,
  inputGroupVariants,
} from "../input-group/input-group.js"
import { focusSibling, Segment, segmentsClass, separatorClass } from "./segment.js"

export interface TimePickerLabels {
  hour: string
  minute: string
  second: string
  period: string
}

export interface TimePickerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** 24-hour `HH:mm`, or `HH:mm:ss` with `seconds`. `null` while incomplete. */
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
  /** Defaults to the locale's clock. */
  hourCycle?: 12 | 24
  locale?: string
  seconds?: boolean
  /** Minutes the arrow keys move by. */
  minuteStep?: number
  size?: InputGroupSize
  invalid?: boolean
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  labels?: Partial<TimePickerLabels>
  icon?: ReactNode | false
  name?: string
  id?: string
}

interface Parts {
  hour: number | null
  minute: number | null
  second: number | null
}

const defaultLabels: TimePickerLabels = {
  hour: "Hours",
  minute: "Minutes",
  second: "Seconds",
  period: "AM/PM",
}

export const parseTime = (value: string | null | undefined): Parts => {
  const match = value ? /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value) : null
  if (!match) return { hour: null, minute: null, second: null }
  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
    second: match[3] === undefined ? null : Number(match[3]),
  }
}

const pad = (n: number) => String(n).padStart(2, "0")

export const localeHourCycle = (locale?: string): 12 | 24 => {
  try {
    const hour12 = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hour12
    return hour12 ? 12 : 24
  } catch {
    return 24
  }
}

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** Typed hour and minute segments, each a spinbutton, with an AM/PM segment on 12-hour clocks. */
export const TimePicker = forwardRef<HTMLDivElement, TimePickerProps>(
  (
    {
      value: valueProp,
      defaultValue = null,
      onValueChange,
      hourCycle: hourCycleProp,
      locale: localeProp,
      seconds = false,
      minuteStep = 1,
      size = "md",
      invalid,
      disabled,
      readOnly,
      required,
      labels: labelsProp,
      icon,
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
    const hourCycle = hourCycleProp ?? localeHourCycle(locale)
    const controlled = valueProp !== undefined
    const [parts, setParts] = useState<Parts>(() => parseTime(valueProp ?? defaultValue))
    const [period, setPeriod] = useState<0 | 1>(() =>
      (parseTime(valueProp ?? defaultValue).hour ?? 0) >= 12 ? 1 : 0,
    )
    const emitted = useRef<string | null>(valueProp ?? defaultValue)
    const emit = useEventCallback(onValueChange)

    // A controlled value from outside replaces the segments; our own echo is ignored.
    useEffect(() => {
      if (!controlled || valueProp === emitted.current) return
      emitted.current = valueProp
      const next = parseTime(valueProp)
      setParts(next)
      if (next.hour !== null) setPeriod(next.hour >= 12 ? 1 : 0)
    }, [controlled, valueProp])

    const update = (next: Parts, nextPeriod = period) => {
      setParts(next)
      setPeriod(nextPeriod)
      const complete =
        next.hour !== null && next.minute !== null && (!seconds || next.second !== null)
      const result = complete
        ? `${pad(next.hour as number)}:${pad(next.minute as number)}${seconds ? `:${pad(next.second as number)}` : ""}`
        : null
      if (result !== emitted.current) {
        emitted.current = result
        emit(result)
      }
    }

    const twelve = hourCycle === 12
    const shownHour =
      parts.hour === null ? null : twelve ? parts.hour % 12 || 12 : parts.hour
    const toHour24 = (h: number, p: 0 | 1) => (twelve ? (h % 12) + (p ? 12 : 0) : h)
    const groupRef = useRef<HTMLDivElement | null>(null)
    const rootRef = useComposedRefs(groupRef, ref)
    const advance = () => {
      const active = document.activeElement
      if (active instanceof HTMLElement && groupRef.current?.contains(active))
        focusSibling(active, 1)
    }

    return (
      <div
        ref={rootRef}
        role="group"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy ?? (ariaLabel ? undefined : control.labelId)}
        aria-describedby={control.describedBy}
        className={inputGroupVariants({
          size,
          className: cx("kg-time-picker data-size:w-auto not-data-disabled:cursor-default", className),
        })}
        data-segment-group=""
        data-size={size}
        data-invalid={control.invalid || undefined}
        data-disabled={control.disabled || undefined}
        {...props}
      >
        {icon !== false && (
          <span className={inputGroupAddon("icon")} aria-hidden="true">
            {icon ?? <ClockIcon />}
          </span>
        )}
        <span className={segmentsClass}>
          <Segment
            id={control.id}
            label={labels.hour}
            placeholder="--"
            value={shownHour}
            min={twelve ? 1 : 0}
            max={twelve ? 12 : 23}
            display={pad}
            disabled={control.disabled}
            readOnly={readOnly}
            invalid={control.invalid}
            onChange={(h) => update({ ...parts, hour: h === null ? null : toHour24(h, period) })}
            onFilled={advance}
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
            step={minuteStep}
            display={pad}
            disabled={control.disabled}
            readOnly={readOnly}
            invalid={control.invalid}
            onChange={(m) => update({ ...parts, minute: m })}
            onFilled={advance}
          />
          {seconds && (
            <>
              <span className={separatorClass} aria-hidden="true">
                :
              </span>
              <Segment
                label={labels.second}
                placeholder="--"
                value={parts.second}
                min={0}
                max={59}
                display={pad}
                disabled={control.disabled}
                readOnly={readOnly}
                invalid={control.invalid}
                onChange={(s) => update({ ...parts, second: s })}
                onFilled={advance}
              />
            </>
          )}
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
              readOnly={readOnly}
              invalid={control.invalid}
              onChange={(p) => {
                const nextPeriod: 0 | 1 = p ? 1 : 0
                update(
                  {
                    ...parts,
                    hour:
                      parts.hour === null ? null : toHour24(parts.hour % 12 || 12, nextPeriod),
                  },
                  nextPeriod,
                )
              }}
            />
          )}
        </span>
        {name !== undefined && (
          <input type="hidden" name={name} value={emitted.current ?? ""} />
        )}
      </div>
    )
  },
)

TimePicker.displayName = "TimePicker"
