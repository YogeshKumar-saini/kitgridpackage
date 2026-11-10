import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode, useId } from "react"
import { variants } from "../../utils/variants.js"

export type UsageMeterSize = "sm" | "md" | "lg"
export type UsageMeterLevel = "ok" | "warning" | "danger"

export interface UsageMeterSegment {
  label: string
  value: number
  /** Any CSS color. Defaults step through accent shades. */
  color?: string
}

export interface UsageMeterProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode
  /** Total used. Ignored when `segments` is given; their sum is used instead. */
  value?: number
  max: number
  /** Splits the bar into labelled parts with a legend. */
  segments?: UsageMeterSegment[]
  /** Formats amounts in the readout, e.g. `(n) => `${n} GB``. */
  format?: (value: number) => string
  /** Fractions of `max` at which the bar turns warning and danger. */
  thresholds?: [warning: number, danger: number]
  size?: UsageMeterSize
  /** Hides the “used / max” readout. */
  hideValue?: boolean
}

const meterVariants = variants({
  base: "kg-usage-meter grid min-w-0 gap-2 text-kg-sm",
  variants: {
    size: {
      sm: "[--_height:0.3125rem]",
      md: "[--_height:0.5rem]",
      lg: "[--_height:0.75rem]",
    },
    level: {
      ok: "[--_tone:var(--kg-accent)]",
      warning: "[--_tone:var(--kg-warning)]",
      danger: "[--_tone:var(--kg-danger)]",
    },
  },
  defaults: { size: "md", level: "ok" },
})

const SEGMENT_COLORS = [
  "var(--kg-accent)",
  "color-mix(in oklab, var(--kg-accent) 55%, var(--kg-fg-faint))",
  "color-mix(in oklab, var(--kg-accent) 25%, var(--kg-fg-faint))",
  "var(--kg-fg-faint)",
]

const defaultFormat = (n: number) => String(Number(n.toFixed(1)))

/** Quota consumption as a `meter`, with thresholds and an optional per-category breakdown. */
export const UsageMeter = forwardRef<HTMLDivElement, UsageMeterProps>(
  (
    {
      label,
      value = 0,
      max,
      segments,
      format = defaultFormat,
      thresholds = [0.75, 0.9],
      size = "md",
      hideValue = false,
      className,
      ...props
    },
    ref,
  ) => {
    const labelId = useId()
    const safeMax = max > 0 ? max : 1
    const used = segments ? segments.reduce((sum, s) => sum + Math.max(0, s.value), 0) : value
    const ratio = Math.min(1, Math.max(0, used / safeMax))
    const level: UsageMeterLevel =
      ratio >= thresholds[1] ? "danger" : ratio >= thresholds[0] ? "warning" : "ok"
    const text = `${format(used)} / ${format(max)}`

    return (
      <div
        ref={ref}
        className={meterVariants({ size, level, className })}
        data-size={size}
        data-level={level}
        data-segmented={segments ? true : undefined}
        {...props}
      >
        <div className="kg-usage-meter__head flex items-baseline justify-between gap-3">
          <span id={labelId} className="kg-usage-meter__label font-medium text-kg-fg">
            {label}
          </span>
          {!hideValue && (
            <span className="kg-usage-meter__value text-kg-fg-muted tabular-nums [&_strong]:font-semibold [&_strong]:text-kg-fg" aria-hidden="true">
              <strong>{format(used)}</strong> / {format(max)}
            </span>
          )}
        </div>
        <div
          role="meter"
          aria-labelledby={labelId}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={Math.min(used, max)}
          aria-valuetext={`${text}${level === "ok" ? "" : `, ${level === "danger" ? "near limit" : "high"}`}`}
          className="kg-usage-meter__track flex h-(--_height) gap-[2px] overflow-hidden rounded-full bg-kg-muted inset-ring-1 inset-ring-kg-ink/30"
        >
          {segments ? (
            segments.map((segment, index) => (
              <span
                key={segment.label}
                className={`kg-usage-meter__fill h-full w-[calc(var(--_size)*100%)] flex-none origin-left scale-x-100 transition-[scale] duration-(--kg-duration-slower) ease-kg-out starting:scale-x-0 bg-(--_color) first:rounded-s-full`}
                style={
                  {
                    "--_size": Math.max(0, segment.value) / safeMax,
                    "--_color": segment.color ?? SEGMENT_COLORS[index % SEGMENT_COLORS.length],
                  } as CSSProperties
                }
              />
            ))
          ) : (
            <span
              className="kg-usage-meter__fill h-full w-[calc(var(--_size)*100%)] flex-none origin-left scale-x-100 transition-[scale] duration-(--kg-duration-slower) ease-kg-out starting:scale-x-0 rounded-full bg-(--_tone)"
              style={{ "--_size": ratio } as CSSProperties}
            />
          )}
        </div>
        {segments && (
          <ul className="kg-usage-meter__legend m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 text-kg-xs text-kg-fg-muted">
            {segments.map((segment, index) => (
              <li key={segment.label} className="inline-flex items-center gap-1.5">
                <span
                  className="kg-usage-meter__swatch size-2 rounded-[2px] bg-(--_color)"
                  aria-hidden="true"
                  style={
                    {
                      "--_color":
                        segment.color ?? SEGMENT_COLORS[index % SEGMENT_COLORS.length],
                    } as CSSProperties
                  }
                />
                {segment.label}
                <span className="kg-usage-meter__amount text-kg-fg tabular-nums">{format(segment.value)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  },
)
UsageMeter.displayName = "UsageMeter"
