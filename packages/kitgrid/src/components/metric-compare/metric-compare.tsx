import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"

export interface MetricCompareSide {
  label: ReactNode
  value: number
}

export interface MetricCompareProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode
  current: MetricCompareSide
  previous: MetricCompareSide
  format?: (value: number) => string
  /** For metrics where lower is better, such as latency or churn. */
  invert?: boolean
}

const changeTones = {
  positive: "bg-kg-paper-sage",
  negative: "bg-kg-paper-rose",
  neutral: "bg-kg-muted",
} as const

const defaultFormat = (n: number) => new Intl.NumberFormat("en-US").format(n)

/** Two periods of one metric, with paired bars and the change between them. */
export const MetricCompare = forwardRef<HTMLDivElement, MetricCompareProps>(
  (
    { label, current, previous, format = defaultFormat, invert = false, className, ...props },
    ref,
  ) => {
    const max = Math.max(Math.abs(current.value), Math.abs(previous.value), 1e-9)
    const change =
      previous.value === 0 ? null : ((current.value - previous.value) / Math.abs(previous.value)) * 100
    const direction =
      change === null || Math.abs(change) < 0.05 ? "flat" : change > 0 ? "up" : "down"
    const tone =
      direction === "flat" ? "neutral" : (direction === "up") !== invert ? "positive" : "negative"
    const changeText =
      change === null
        ? "new"
        : `${direction === "up" ? "+" : direction === "down" ? "-" : ""}${Math.abs(change).toFixed(1)}%`

    return (
      <div ref={ref} className={cx("kg-metric-compare grid min-w-0 gap-3", className)} {...props}>
        <div className="kg-metric-compare__head flex items-center justify-between gap-3">
          <span className="kg-metric-compare__label text-kg-sm font-medium text-kg-fg-muted">{label}</span>
          <span className={`kg-metric-compare__change rounded-full px-[0.4375rem] py-0.5 text-kg-xs font-semibold text-kg-fg tabular-nums ${changeTones[tone]}`} data-tone={tone} data-trend={direction}>
            {changeText}
          </span>
        </div>
        <dl className="kg-metric-compare__rows m-0 grid gap-2.5">
          {[
            { side: current, key: "current" },
            { side: previous, key: "previous" },
          ].map(({ side, key }) => (
            <div key={key} className="kg-metric-compare__row grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1" data-side={key}>
              <dt className="kg-metric-compare__period text-kg-xs text-kg-fg-faint">{side.label}</dt>
              <dd className={`kg-metric-compare__value m-0 font-semibold tracking-[-0.01em] tabular-nums ${key === "current" ? "text-(length:--kg-text-xl) text-kg-fg" : "text-kg-base text-kg-fg-muted"}`}>{format(side.value)}</dd>
              <dd className="kg-metric-compare__bar col-span-full m-0 h-1.5 overflow-hidden rounded-full bg-kg-muted" aria-hidden="true">
                <span
                  className={`block size-full origin-left scale-x-(--_size) rounded-[inherit] transition-transform duration-(--kg-duration-slower) ease-kg-spring ${key === "current" ? "bg-kg-ink" : "bg-kg-fg-faint"}`}
                  style={{ "--_size": Math.abs(side.value) / max } as CSSProperties} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    )
  },
)
MetricCompare.displayName = "MetricCompare"
