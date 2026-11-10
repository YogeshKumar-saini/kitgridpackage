"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useState,
} from "react"
import { useLocale } from "../../hooks/use-locale.js"
import { useRovingFocus } from "../../hooks/use-roving-focus.js"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"

export type UptimeBarsStatus = "up" | "degraded" | "down" | "maintenance" | "none"

export interface UptimeBarsDay {
  /** ISO date, `2026-10-24`. */
  date: string
  status: UptimeBarsStatus
  /** Percent for the day, 0 to 100. */
  uptime?: number
  /** A short line such as "Elevated latency, 18 min". */
  note?: string
}

export interface UptimeBarsLabels {
  status?: Partial<Record<UptimeBarsStatus, string>>
  start?: string
  end?: string
  uptime?: string
}

export interface UptimeBarsProps extends HTMLAttributes<HTMLDivElement> {
  /** Oldest first. */
  days: readonly UptimeBarsDay[]
  /** Names the bar list, e.g. "API uptime". */
  label: string
  /** Shown at the top right. Defaults to the mean uptime across days with data. */
  summary?: ReactNode
  locale?: string
  labels?: UptimeBarsLabels
}

const statusWords: Record<UptimeBarsStatus, string> = {
  up: "No downtime",
  degraded: "Degraded",
  down: "Outage",
  maintenance: "Maintenance",
  none: "No data",
}

const formatDate = (date: string, locale: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })

const formatPct = (value: number) =>
  `${value >= 99.995 ? "100" : value.toFixed(value >= 99 ? 2 : 1)}%`

const cap =
  "before:absolute before:inset-x-0 before:top-0 before:rounded-[inherit] before:bg-kg-ink"

/* Paper Layers: flat status fills; bad days carry an ink cap so they read without colour. */
const barVariants = variants({
  base: [
    "kg-uptime-bars__bar relative min-w-0 origin-bottom cursor-default rounded-[2px]",
    "transition-[scale,opacity] duration-(--kg-duration-base) ease-kg-out data-active:scale-y-112",
    "group-has-[[data-active]]/track:not-data-active:opacity-55",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
  ],
  variants: {
    status: {
      up: "bg-kg-success",
      degraded: ["bg-kg-warning before:h-[28%]", cap],
      down: ["bg-kg-danger before:h-full before:opacity-35", cap],
      maintenance:
        "bg-kg-info before:absolute before:inset-x-0 before:bottom-0 before:h-1/2 before:rounded-[inherit] before:bg-kg-surface before:opacity-50",
      none: "bg-kg-muted",
    },
  },
})

/**
 * A status page strip: one bar per day, worst state wins. Bars are a roving list, so arrow keys
 * walk the days and the readout under the strip follows focus or hover.
 */
export const UptimeBars = forwardRef<HTMLDivElement, UptimeBarsProps>(
  ({ days, label, summary, locale: localeProp, labels, className, style, ...props }, ref) => {
    const locale = useLocale(localeProp)
    const words = { ...statusWords, ...labels?.status }
    const [active, setActive] = useState<number | null>(null)
    const [tabStop, setTabStop] = useState(Math.max(days.length - 1, 0))
    const onKeyDown = useRovingFocus({ orientation: "horizontal", loop: false })

    const measured = days.filter((day) => day.uptime != null)
    const mean = measured.length
      ? measured.reduce((sum, day) => sum + (day.uptime ?? 0), 0) / measured.length
      : null

    const describe = (day: UptimeBarsDay) =>
      [
        formatDate(day.date, locale),
        words[day.status],
        day.uptime != null && formatPct(day.uptime),
        day.note,
      ]
        .filter(Boolean)
        .join(", ")

    const current = active != null ? days[active] : undefined

    return (
      <div
        ref={ref}
        className={cx("kg-uptime-bars grid min-w-0 gap-2.5", className)}
        style={
          {
            "--_count": days.length,
            "--_cols": `repeat(${Math.max(days.length, 1)}, minmax(1px, 1fr))`,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-uptime-bars__head flex min-w-0 items-baseline justify-between gap-3">
          <span className="kg-uptime-bars__label text-kg-sm font-[580] text-kg-fg">
            {label}
          </span>
          <span className="kg-uptime-bars__summary text-kg-sm font-semibold tabular-nums text-kg-fg [&_span]:font-[450] [&_span]:text-kg-fg-muted">
            {summary ??
              (mean != null && (
                <>
                  {formatPct(mean)} <span>{labels?.uptime ?? "uptime"}</span>
                </>
              ))}
          </span>
        </div>
        <ol
          className="kg-uptime-bars__track group/track m-0 grid h-[2.25rem] list-none grid-cols-(--_cols) gap-[clamp(1px,0.35%,3px)] p-0"
          aria-label={label}
          onKeyDown={(event) => {
            const item = onKeyDown(event)
            if (item) setTabStop(Number(item.dataset.index))
          }}
          onPointerLeave={() => setActive(null)}
        >
          {days.map((day, index) => (
            <li
              key={day.date}
              className={barVariants({ status: day.status })}
              data-status={day.status}
              data-active={active === index || undefined}
              data-kg-item=""
              data-index={index}
              tabIndex={index === tabStop ? 0 : -1}
              onFocus={() => {
                setActive(index)
                setTabStop(index)
              }}
              onBlur={() => setActive(null)}
              onPointerEnter={() => setActive(index)}
            >
              <span className="kg-visually-hidden">{describe(day)}</span>
            </li>
          ))}
        </ol>
        <div
          className="kg-uptime-bars__foot flex min-h-[1.25rem] min-w-0 items-baseline justify-between gap-3 text-kg-xs text-kg-fg-faint"
          aria-hidden="true"
        >
          {current ? (
            <span
              className="kg-uptime-bars__readout inline-flex flex-wrap gap-2 text-kg-fg-muted [&_strong]:font-semibold [&_strong]:text-kg-fg"
              data-status={current.status}
            >
              <strong>{formatDate(current.date, locale)}</strong>
              {words[current.status]}
              {current.uptime != null && <span>{formatPct(current.uptime)}</span>}
              {current.note && <span>{current.note}</span>}
            </span>
          ) : (
            <>
              <span>{labels?.start ?? `${days.length} days ago`}</span>
              <span>{labels?.end ?? "Today"}</span>
            </>
          )}
        </div>
      </div>
    )
  },
)

UptimeBars.displayName = "UptimeBars"
