import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"

export type StatSize = "sm" | "md" | "lg"
export type StatTrend = "up" | "down" | "flat"

export interface StatDeltaLabels {
  up?: string
  down?: string
  flat?: string
}

export interface StatProps extends HTMLAttributes<HTMLDListElement> {
  label: ReactNode
  value: ReactNode
  /** Change versus the previous period, in percent. */
  delta?: number
  /** For metrics where down is good, such as churn or refund rate. */
  invertDelta?: boolean
  /** Defaults to the absolute value with up to one decimal and a `%`. */
  formatDelta?: (delta: number) => string
  /** Words read before the delta, since the arrow alone is visual. */
  deltaLabels?: StatDeltaLabels
  /** Context such as “vs last month”. */
  helper?: ReactNode
  /** Recent values, oldest first, drawn as a sparkline. */
  trend?: number[]
  /** Exposes the sparkline as an image with this name. Hidden from assistive tech otherwise. */
  trendLabel?: string
  size?: StatSize
}

const defaultDeltaLabels: Required<StatDeltaLabels> = {
  up: "up",
  down: "down",
  flat: "no change",
}

// Locale-free so the server and the browser always print the same string.
const defaultFormatDelta = (delta: number) => `${Number(Math.abs(delta).toFixed(1))}%`

const WIDTH = 100
const HEIGHT = 32
const PAD = 2

type Point = [x: number, y: number]

/** Catmull-Rom through every point, converted to cubic Béziers, clamped to the box. */
const toPath = (points: Point[]): string => {
  const at = (index: number): Point =>
    points[Math.max(0, Math.min(points.length - 1, index))] ?? [0, 0]
  const clampY = (y: number) => Math.max(0, Math.min(HEIGHT, y))
  const round = (n: number) => Math.round(n * 100) / 100
  let d = `M${round(at(0)[0])} ${round(at(0)[1])}`
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = at(i - 1)
    const [x1, y1] = at(i)
    const [x2, y2] = at(i + 1)
    const [x3, y3] = at(i + 2)
    const c1x = x1 + (x2 - x0) / 6
    const c1y = clampY(y1 + (y2 - y0) / 6)
    const c2x = x2 - (x3 - x1) / 6
    const c2y = clampY(y2 - (y3 - y1) / 6)
    d += ` C${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(x2)} ${round(y2)}`
  }
  return d
}

const Arrow = ({ trend }: { trend: StatTrend }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {trend === "flat" ? (
      <path d="M3.5 8h9" />
    ) : trend === "up" ? (
      <path d="M8 12.5v-9M4 7.5l4-4 4 4" />
    ) : (
      <path d="M8 3.5v9M4 8.5l4 4 4-4" />
    )}
  </svg>
)

const Sparkline = ({
  values,
  label,
}: {
  values: number[]
  label: string | undefined
}) => {
  const finite = values.filter(Number.isFinite)
  const min = Math.min(...finite)
  const max = Math.max(...finite)
  const range = max - min
  const points = finite.map((value, index): Point => {
    const x = (index / (finite.length - 1)) * WIDTH
    const y =
      range === 0 ? HEIGHT / 2 : PAD + (1 - (value - min) / range) * (HEIGHT - PAD * 2)
    return [x, y]
  })
  const line = toPath(points)
  const last = points[points.length - 1] ?? [WIDTH, HEIGHT / 2]

  return (
    <dd
      className="kg-stat__trend relative col-start-2 row-span-3 row-start-1 m-0 h-10 w-[6.5rem] self-end"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg
        className="block size-full overflow-visible"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          className="kg-stat__trend-area fill-(--_trend) opacity-15"
          d={`${line} L${WIDTH} ${HEIGHT} L0 ${HEIGHT} Z`}
        />
        <path
          className="kg-stat__trend-line fill-none stroke-(color:--_trend) [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.75]"
          d={line}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        className="kg-stat__trend-dot absolute size-[0.4375rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--_trend) shadow-[0_0_0_2px_var(--kg-surface)]"
        // Physical `left`: the SVG it sits on is not mirrored in right-to-left layouts.
        style={{
          left: `${(last[0] / WIDTH) * 100}%`,
          top: `${(last[1] / HEIGHT) * 100}%`,
        }}
      />
    </dd>
  )
}

const SIZE: Record<StatSize, string> = {
  sm: "gap-1 [--_value:var(--kg-text-xl)]",
  md: "gap-1.5 [--_value:var(--kg-text-2xl)]",
  lg: "gap-2 [--_value:var(--kg-text-3xl)]",
}

/* Paper chips; the arrow carries the direction, so colour is never the only signal. */
const DELTA_TONE = {
  positive: "bg-kg-paper-sage text-kg-fg",
  negative: "bg-kg-paper-rose text-kg-fg",
  neutral: "bg-kg-muted text-kg-fg-muted",
}

/**
 * A KPI: label, value, a signed change and an optional sparkline. Rendered as a description
 * list so the label and value stay paired for screen readers.
 */
export const Stat = forwardRef<HTMLDListElement, StatProps>(
  (
    {
      label,
      value,
      delta,
      invertDelta = false,
      formatDelta = defaultFormatDelta,
      deltaLabels,
      helper,
      trend,
      trendLabel,
      size = "md",
      className,
      ...props
    },
    ref,
  ) => {
    const hasDelta = typeof delta === "number" && Number.isFinite(delta)
    const direction: StatTrend =
      !hasDelta || delta === 0 ? "flat" : delta > 0 ? "up" : "down"
    const good = direction === "flat" ? "neutral" : (direction === "up") !== invertDelta
    const tone = good === "neutral" ? "neutral" : good ? "positive" : "negative"
    const words = { ...defaultDeltaLabels, ...deltaLabels }
    const showTrend = Array.isArray(trend) && trend.filter(Number.isFinite).length > 1

    return (
      <dl
        ref={ref}
        className={cx(
          "kg-stat m-0 grid min-w-0 content-start [--_trend:var(--kg-stat-trend-color,var(--kg-accent))]",
          showTrend ? "grid-cols-[minmax(0,1fr)_auto]" : "grid-cols-[minmax(0,1fr)]",
          SIZE[size] ?? SIZE.md,
          className,
        )}
        data-size={size}
        data-has-trend={showTrend || undefined}
        {...props}
      >
        <dt className="kg-stat__label col-start-1 text-kg-sm font-medium leading-[1.3] text-kg-fg-muted">{label}</dt>
        <dd className="kg-stat__value col-start-1 m-0 text-(length:--_value) font-bold leading-[1.1] tracking-[-0.025em] tabular-nums text-kg-fg">{value}</dd>
        {(hasDelta || helper != null) && (
          <dd className="kg-stat__meta col-start-1 m-0 flex flex-wrap items-center gap-2 text-kg-sm leading-[1.3]">
            {hasDelta && (
              <span
                className={cx(
                  "kg-stat__delta inline-flex h-[1.375rem] items-center gap-0.5 rounded-full ps-[0.3125rem] pe-[0.4375rem] text-kg-xs font-semibold tabular-nums [&_svg]:size-3.5",
                  DELTA_TONE[tone],
                )}
                data-trend={direction}
                data-tone={tone}
              >
                <Arrow trend={direction} />
                <span className="kg-visually-hidden">{words[direction]} </span>
                {formatDelta(delta ?? 0)}
              </span>
            )}
            {helper != null && <span className="kg-stat__helper text-kg-fg-muted">{helper}</span>}
          </dd>
        )}
        {showTrend && <Sparkline values={trend} label={trendLabel} />}
      </dl>
    )
  },
)

Stat.displayName = "Stat"
