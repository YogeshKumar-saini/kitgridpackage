"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useEventCallback } from "../../hooks/use-event-callback.js"
import { useLocale } from "../../hooks/use-locale.js"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"
import { RollingDigits } from "../quantity-stepper/rolling-digits.js"
import { useDocumentHidden } from "./use-document-hidden.js"

export type CountdownVariant = "inline" | "blocks"
export type CountdownSize = "sm" | "md" | "lg"
export type CountdownUnit = "days" | "hours" | "minutes" | "seconds"

export interface CountdownParts {
  days: number
  hours: number
  minutes: number
  seconds: number
  /** Milliseconds left. */
  total: number
}

export interface CountdownLabels {
  /** Leads the inline variant and the screen-reader text. Empty string hides it. */
  prefix?: string
  /** Captions under each block. */
  units?: Partial<Record<CountdownUnit, string>>
  /** Day suffix in the inline variant, as in "2d 14:09:33". */
  daysShort?: string
  /** Screen-reader text, updated at most once a minute. Defaults to Intl unit formatting. */
  remaining?: (parts: CountdownParts) => string
  lessThanMinute?: string
}

export interface CountdownProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  endsAt: Date | number | string
  variant?: CountdownVariant
  size?: CountdownSize
  /** Drop leading units that are zero: no "00 days" a day before the end. */
  hideZeroUnits?: boolean
  showSeconds?: boolean
  /** Called once when the time runs out, including when `endsAt` is already past on mount. */
  onComplete?: () => void
  /** Shown once the time has run out. */
  expiredLabel?: ReactNode
  locale?: string
  labels?: CountdownLabels
}

const defaultUnits: Record<CountdownUnit, string> = {
  days: "Days",
  hours: "Hours",
  minutes: "Mins",
  seconds: "Secs",
}

const MAX_TIMEOUT = 2_147_483_647

const toTime = (value: Date | number | string): number =>
  value instanceof Date
    ? value.getTime()
    : typeof value === "number"
      ? value
      : Date.parse(value)

export const getCountdownParts = (total: number): CountdownParts => {
  const clamped = Math.max(0, total)
  const seconds = Math.floor(clamped / 1000)
  return {
    days: Math.floor(seconds / 86_400),
    hours: Math.floor(seconds / 3600) % 24,
    minutes: Math.floor(seconds / 60) % 60,
    seconds: seconds % 60,
    total: clamped,
  }
}

const pad = (value: number) => String(value).padStart(2, "0")

// How much of the next unit up each block still holds, drawn as an arc around its edge.
const unitSpan: Partial<Record<CountdownUnit, number>> = {
  hours: 24,
  minutes: 60,
  seconds: 60,
}

const countdownVariants = variants({
  base: "kg-countdown inline-flex items-center text-kg-fg tabular-nums",
  variants: {
    size: {
      sm: "text-kg-sm [--_block:2.625rem]",
      md: "text-kg-base [--_block:3.25rem]",
      lg: "text-kg-lg [--_block:4rem]",
    },
  },
  defaults: { size: "md" },
})

/**
 * A sale or shipping-cutoff timer. The server and first client render show a stable placeholder;
 * ticking starts after mount, aligned to whole seconds, and pauses while the tab is hidden.
 */
export const Countdown = forwardRef<HTMLDivElement, CountdownProps>(
  (
    {
      endsAt,
      variant = "inline",
      size = "md",
      hideZeroUnits = false,
      showSeconds = true,
      onComplete,
      expiredLabel = "Offer ended",
      locale,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const end = toTime(endsAt)
    const [now, setNow] = useState<number | null>(null)
    const hidden = useDocumentHidden()
    const complete = useEventCallback(onComplete)
    const resolvedLocale = useLocale(locale)
    const completedFor = useRef<number | null>(null)

    const prefix = labels?.prefix ?? "Ends in"
    const units = { ...defaultUnits, ...labels?.units }
    const mounted = now !== null
    const remaining = now === null || Number.isNaN(end) ? null : end - now
    const expired = Number.isNaN(end) || (remaining !== null && remaining <= 0)

    // Mount, a new end time, and returning to the tab all resync with the wall clock.
    useEffect(() => {
      if (!hidden) setNow(Date.now())
    }, [end, hidden])

    useEffect(() => {
      if (now === null || expired || hidden) return
      // Wake exactly when the displayed second changes rather than drifting on a 1s interval.
      const delay = ((end - Date.now()) % 1000) + 5
      const timer = setTimeout(() => setNow(Date.now()), delay)
      return () => clearTimeout(timer)
    }, [now, end, expired, hidden])

    useEffect(() => {
      if (!mounted || Number.isNaN(end)) return
      const fire = () => {
        if (completedFor.current === end) return
        completedFor.current = end
        setNow(Date.now())
        complete()
      }
      const left = end - Date.now()
      if (left <= 0) {
        fire()
        return
      }
      const timer = setTimeout(fire, Math.min(left, MAX_TIMEOUT))
      return () => clearTimeout(timer)
    }, [mounted, end, complete])

    const formatters = useMemo(() => {
      const unit = (name: "day" | "hour" | "minute") =>
        new Intl.NumberFormat(resolvedLocale, {
          style: "unit",
          unit: name,
          unitDisplay: "long",
        })
      return {
        day: unit("day"),
        hour: unit("hour"),
        minute: unit("minute"),
        list: new Intl.ListFormat(resolvedLocale, { style: "long", type: "unit" }),
      }
    }, [resolvedLocale])

    const parts = remaining === null ? null : getCountdownParts(remaining)

    // Minute granularity on purpose: a timer that re-announces every second is unusable.
    const spoken = (() => {
      if (!parts) return ""
      if (labels?.remaining) return labels.remaining(parts)
      const pieces: string[] = []
      if (parts.days) pieces.push(formatters.day.format(parts.days))
      if (parts.hours) pieces.push(formatters.hour.format(parts.hours))
      if (parts.minutes) pieces.push(formatters.minute.format(parts.minutes))
      return pieces.length
        ? formatters.list.format(pieces)
        : (labels?.lessThanMinute ?? "less than a minute")
    })()

    if (expired && now !== null) {
      return (
        <div
          ref={ref}
          className={countdownVariants({ size, className })}
          data-variant={variant}
          data-size={size}
          data-state="expired"
          {...props}
        >
          <span className="kg-countdown__expired animate-[kg-fade-in_var(--kg-duration-base)_var(--kg-ease-out)] font-semibold text-kg-fg-muted">{expiredLabel}</span>
        </div>
      )
    }

    type Segment = { unit: CountdownUnit; value: string }
    const segments: Segment[] = parts
      ? [
          { unit: "days", value: String(parts.days) },
          { unit: "hours", value: pad(parts.hours) },
          { unit: "minutes", value: pad(parts.minutes) },
          { unit: "seconds", value: pad(parts.seconds) },
        ]
      : [
          { unit: "days", value: "--" },
          { unit: "hours", value: "--" },
          { unit: "minutes", value: "--" },
          { unit: "seconds", value: "--" },
        ]

    const visible = segments.filter((segment) => {
      if (segment.unit === "seconds" && !showSeconds) return false
      if (segment.unit === "days") {
        if (variant === "inline") return parts !== null && parts.days > 0
        if (hideZeroUnits && parts !== null && parts.days === 0) return false
        return true
      }
      if (hideZeroUnits && parts !== null && segment.unit === "hours") {
        return parts.days > 0 || parts.hours > 0
      }
      return true
    })

    const digits = (value: string) =>
      value === "--" ? (
        <span className="kg-countdown__placeholder leading-[1.25em] text-kg-fg-faint">--</span>
      ) : (
        <RollingDigits value={value} />
      )

    return (
      <div
        ref={ref}
        role="timer"
        className={countdownVariants({ size, className })}
        data-variant={variant}
        data-size={size}
        data-state={parts ? "running" : "pending"}
        {...props}
      >
        <span className="kg-visually-hidden">
          {spoken ? (prefix ? `${prefix} ${spoken}` : spoken) : prefix}
        </span>
        {variant === "inline" ? (
          <span
            className="kg-countdown__inline inline-flex items-center gap-[0.4em] leading-[1.25]"
            aria-hidden="true"
          >
            {prefix && <span className="kg-countdown__prefix text-kg-fg-muted">{prefix}</span>}
            <span className="kg-countdown__clock inline-flex items-center font-[650] tracking-[0.01em]">
              {visible.map((segment, index) => (
                <span key={segment.unit} className="kg-countdown__segment inline-flex items-center">
                  {digits(segment.value)}
                  {segment.unit === "days" ? (
                    <span className="kg-countdown__day-suffix ms-[0.05em] me-[0.35em]">
                      {labels?.daysShort ?? "d"}
                    </span>
                  ) : (
                    index < visible.length - 1 && (
                      <span className="kg-countdown__colon mx-[0.06em] opacity-55">:</span>
                    )
                  )}
                </span>
              ))}
            </span>
          </span>
        ) : (
          <span className="kg-countdown__blocks inline-flex gap-2" aria-hidden="true">
            {visible.map((segment) => (
              <span
                key={segment.unit}
                className={cx(
                  "kg-countdown__block relative grid min-w-[var(--_block)] content-center justify-items-center gap-[0.3em] overflow-hidden rounded-kg-md border-2 border-kg-ink bg-kg-surface px-[0.5em] pt-[0.55em] pb-[0.6em] shadow-kg-xs",
                  "data-progress:before:absolute data-progress:before:inset-x-0 data-progress:before:bottom-0 data-progress:before:h-[3px] data-progress:before:origin-left data-progress:before:bg-kg-paper-sage data-progress:before:scale-x-[var(--kg-countdown-turn)]",
                  "data-progress:before:transition-[scale] data-progress:before:duration-(--kg-duration-slower) data-progress:before:ease-kg-out data-progress:before:content-['']",
                )}
                data-unit={segment.unit}
                data-progress={
                  parts && unitSpan[segment.unit] !== undefined ? "" : undefined
                }
                style={
                  parts && unitSpan[segment.unit] !== undefined
                    ? ({
                        "--kg-countdown-turn":
                          Number(segment.value) / (unitSpan[segment.unit] as number),
                      } as CSSProperties)
                    : undefined
                }
              >
                <span className="kg-countdown__value inline-flex text-[1.45em] leading-none font-bold tracking-[-0.01em]">{digits(segment.value)}</span>
                <span className="kg-countdown__unit text-[0.62em] font-semibold tracking-[0.06em] text-kg-fg-muted uppercase">{units[segment.unit]}</span>
              </span>
            ))}
          </span>
        )}
      </div>
    )
  },
)

Countdown.displayName = "Countdown"
