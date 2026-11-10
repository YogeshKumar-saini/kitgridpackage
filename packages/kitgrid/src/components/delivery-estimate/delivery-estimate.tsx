"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useLocale } from "../../hooks/use-locale.js"
import { cx } from "../../utils/cx.js"
import { getDeliveryEstimate } from "./delivery-date.js"

export type DeliveryEstimateVariant = "compact" | "detailed"

export interface DeliveryEstimateMessage {
  /** Formatted delivery date, or range when `range` is true. */
  date: string
  range: boolean
  /** Time left before today's cutoff, e.g. "3h 12m"; absent once it has passed. */
  time?: string
}

export interface DeliveryEstimateLabels {
  message?: (info: DeliveryEstimateMessage) => ReactNode
  ordered?: string
  shipped?: string
  delivered?: string
  today?: string
  /** Read by screen readers while the date is computed after mount. */
  calculating?: string
  /** Accessible name of the detailed timeline. */
  timeline?: string
}

export interface DeliveryEstimateProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  minDays: number
  maxDays?: number
  handlingDays?: number
  skipWeekends?: boolean
  holidays?: readonly (Date | string)[]
  /** Daily order cutoff, 24h "HH:MM" in the store's time zone. */
  cutoff?: string
  /** IANA zone of the store. Pass it with `now` for output that is identical on server and client. */
  timeZone?: string
  /**
   * Fixes the clock (SSR, tests, previews). Without it the estimate renders a placeholder on the
   * server, then computes after mount and refreshes every minute.
   */
  now?: Date | number
  locale?: string
  variant?: DeliveryEstimateVariant
  /** Replaces the truck icon. */
  icon?: ReactNode
  labels?: DeliveryEstimateLabels
}

const defaultMessage = ({ date, range, time }: DeliveryEstimateMessage): ReactNode =>
  time ? (
    <>
      Order within <strong>{time}</strong> to get it {range ? "" : "by "}
      <strong>{date}</strong>
    </>
  ) : (
    <>
      Get it {range ? "" : "by "}
      <strong>{date}</strong>
    </>
  )

const defaultLabels: Required<DeliveryEstimateLabels> = {
  message: defaultMessage,
  ordered: "Ordered",
  shipped: "Shipped",
  delivered: "Delivered",
  today: "Today",
  calculating: "Calculating delivery date",
  timeline: "Delivery timeline",
}

const TruckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M3 6.5h10.5v9H3zM13.5 9.5h4l3 3.2v2.8h-7" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </svg>
)

const iconClass =
  "kg-delivery-estimate__icon inline-grid h-[1.4em] w-[1.3em] shrink-0 place-items-center text-kg-fg-muted [&_svg]:size-[1.3em]"

const markerFill: Record<string, string> = {
  ordered: "bg-kg-ink",
  shipped: "bg-kg-paper-sage",
  delivered: "bg-kg-surface",
}

const toTime = (value: Date | number) =>
  typeof value === "number" ? value : value.getTime()

const useMinuteClock = (fixed: number | null): number | null => {
  const [clock, setClock] = useState<number | null>(null)
  useEffect(() => {
    if (fixed !== null) return
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      setClock(Date.now())
      timer = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 20)
    }
    tick()
    return () => clearTimeout(timer)
  }, [fixed])
  return fixed ?? clock
}

/** "Get it by Thu, Oct 30" with cutoff urgency, business-day math and a mini timeline. */
export const DeliveryEstimate = forwardRef<HTMLDivElement, DeliveryEstimateProps>(
  (
    {
      minDays,
      maxDays,
      handlingDays,
      skipWeekends = true,
      holidays,
      cutoff,
      timeZone,
      now,
      locale,
      variant = "compact",
      icon,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const current = useMinuteClock(now === undefined ? null : toTime(now))
    const resolvedLocale = useLocale(locale)

    const formats = useMemo(
      () => ({
        long: new Intl.DateTimeFormat(resolvedLocale, {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
        short: new Intl.DateTimeFormat(resolvedLocale, {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
        hours: new Intl.NumberFormat(resolvedLocale, {
          style: "unit",
          unit: "hour",
          unitDisplay: "narrow",
        }),
        minutes: new Intl.NumberFormat(resolvedLocale, {
          style: "unit",
          unit: "minute",
          unitDisplay: "narrow",
        }),
      }),
      [resolvedLocale],
    )

    const root = {
      ref,
      className: cx(
        "kg-delivery-estimate grid gap-3 text-kg-sm leading-[1.4] text-kg-fg [&_strong]:font-[650]",
        "data-[state=pending]:flex data-[state=pending]:items-center data-[state=pending]:gap-2",
        className,
      ),
      "data-variant": variant,
      ...props,
    }

    if (current === null) {
      return (
        <div {...root} data-state="pending">
          <span className={iconClass}>{icon ?? <TruckIcon />}</span>
          <span
            className="kg-delivery-estimate__placeholder h-[0.9em] w-[14em] max-w-[70%] rounded-kg-xs bg-kg-muted"
            aria-hidden="true"
          />
          <span className="kg-visually-hidden">{text.calculating}</span>
        </div>
      )
    }

    const dates = getDeliveryEstimate({
      now: current,
      minDays,
      maxDays,
      handlingDays,
      skipWeekends,
      holidays,
      cutoff,
      timeZone,
    })
    const range = dates.latest.getTime() !== dates.earliest.getTime()
    const date = range
      ? formats.long.formatRange(dates.earliest, dates.latest)
      : formats.long.format(dates.earliest)
    const minutes = dates.cutoffMinutes
    const time =
      minutes === null
        ? undefined
        : [
            minutes >= 60 ? formats.hours.format(Math.floor(minutes / 60)) : null,
            formats.minutes.format(minutes % 60),
          ]
            .filter(Boolean)
            .join(" ")

    const shortDay = (day: Date) =>
      day.getTime() === dates.ordered.getTime() ? text.today : formats.short.format(day)
    const steps = [
      { key: "ordered", label: text.ordered, date: text.today },
      { key: "shipped", label: text.shipped, date: shortDay(dates.shipped) },
      {
        key: "delivered",
        label: text.delivered,
        date: range
          ? formats.short.formatRange(dates.earliest, dates.latest)
          : formats.short.format(dates.earliest),
      },
    ]

    return (
      <div {...root} data-state={time ? "cutoff" : "ready"}>
        <p className="kg-delivery-estimate__summary m-0 flex items-start gap-2">
          <span className={iconClass}>{icon ?? <TruckIcon />}</span>
          <span
            className={cx(
              "kg-delivery-estimate__message animate-[kg-fade-in_var(--kg-duration-base)_var(--kg-ease-out)]",
              time &&
                "[&>strong:first-child]:text-[color-mix(in_oklab,var(--kg-success),var(--kg-fg)_30%)] [&>strong:first-child]:tabular-nums",
            )}
          >
            {text.message(time ? { date, range, time } : { date, range })}
          </span>
        </p>
        {variant === "detailed" && (
          <ol
            className="kg-delivery-estimate__timeline m-0 grid list-none grid-cols-3 p-0"
            aria-label={text.timeline}
          >
            {steps.map((step, index) => (
              <li
                key={step.key}
                className={cx(
                  "kg-delivery-estimate__step relative grid justify-items-center gap-[0.15em] pt-[calc(0.75rem+var(--kg-space)*2)] text-center",
                  index > 0 &&
                    "before:absolute before:start-[-50%] before:end-[50%] before:top-[calc(0.375rem-1px)] before:h-0 before:origin-left before:border-t-2 before:border-kg-ink before:content-[''] rtl:before:origin-right before:animate-[kg-delivery-draw_var(--kg-duration-slower)_var(--kg-ease-out)_both]",
                  index === 2 && "before:border-dashed before:[animation-delay:var(--kg-duration-base)]",
                )}
                data-step={step.key}
              >
                <span
                  className={cx(
                    "kg-delivery-estimate__marker absolute top-0 left-1/2 z-1 size-[0.75rem] -translate-x-1/2 rounded-full border-2 border-kg-ink",
                    markerFill[step.key],
                  )}
                  aria-hidden="true"
                />
                <span className="kg-delivery-estimate__step-label text-kg-xs text-kg-fg-muted">
                  {step.label}
                </span>
                <span className="kg-delivery-estimate__step-date font-semibold tabular-nums">
                  {step.date}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    )
  },
)

DeliveryEstimate.displayName = "DeliveryEstimate"
