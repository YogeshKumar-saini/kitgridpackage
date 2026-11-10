"use client"

import { forwardRef, type HTMLAttributes, useEffect, useState } from "react"
import { cx } from "../../utils/cx.js"

export type RelativeTimeStyle = "long" | "short" | "narrow"

export interface RelativeTimeProps
  extends Omit<HTMLAttributes<HTMLTimeElement>, "children"> {
  date: Date | string | number
  /** Reference point. Pass it from the server to render the same text on both sides. */
  now?: Date | string | number
  /** Re-renders on a cadence that matches the distance. Off when `now` is fixed. */
  live?: boolean
  locale?: string
  formatStyle?: RelativeTimeStyle
  /** Past this many days the absolute date is shown instead. */
  absoluteAfterDays?: number
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
  ["second", 1],
]

const toDate = (input: Date | string | number) =>
  input instanceof Date ? input : new Date(input)

export const formatRelativeTime = (
  date: Date,
  now: Date,
  locale: string,
  style: RelativeTimeStyle,
): string => {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000)
  const abs = Math.abs(seconds)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style })
  if (abs < 45) return rtf.format(0, "second")
  for (const [unit, size] of UNITS) {
    if (abs >= size || unit === "second") {
      return rtf.format(Math.round(seconds / size), unit)
    }
  }
  return rtf.format(seconds, "second")
}

const cadence = (distanceMs: number) => {
  const abs = Math.abs(distanceMs)
  if (abs < 60_000) return 10_000
  if (abs < 3_600_000) return 30_000
  return 3_600_000
}

/** “3 minutes ago”, kept fresh while mounted, with the absolute time as a tooltip. */
export const RelativeTime = forwardRef<HTMLTimeElement, RelativeTimeProps>(
  (
    {
      date,
      now,
      live = true,
      locale = "en-US",
      formatStyle = "long",
      absoluteAfterDays,
      className,
      title,
      ...props
    },
    ref,
  ) => {
    const target = toDate(date)
    const [tick, setTick] = useState(() => (now ? toDate(now) : new Date()))
    const reference = now ? toDate(now) : tick

    useEffect(() => {
      if (now || !live || Number.isNaN(target.getTime())) return
      let timer: ReturnType<typeof setTimeout>
      const schedule = () => {
        timer = setTimeout(
          () => {
            if (!document.hidden) setTick(new Date())
            schedule()
          },
          cadence(target.getTime() - Date.now()),
        )
      }
      schedule()
      return () => clearTimeout(timer)
    }, [now, live, target.getTime()])

    if (Number.isNaN(target.getTime())) return null

    const absolute = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(target)
    const days = Math.abs(target.getTime() - reference.getTime()) / 86_400_000
    const text =
      absoluteAfterDays !== undefined && days > absoluteAfterDays
        ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(target)
        : formatRelativeTime(target, reference, locale, formatStyle)

    return (
      <time
        ref={ref}
        dateTime={target.toISOString()}
        title={title ?? absolute}
        className={cx(
          "kg-relative-time whitespace-nowrap tabular-nums underline decoration-transparent decoration-dotted underline-offset-[3px] transition-[text-decoration-color] duration-(--kg-duration-fast) ease-kg-out hover:decoration-kg-fg-faint",
          className,
        )}
        suppressHydrationWarning
        {...props}
      >
        {text}
      </time>
    )
  },
)
RelativeTime.displayName = "RelativeTime"
