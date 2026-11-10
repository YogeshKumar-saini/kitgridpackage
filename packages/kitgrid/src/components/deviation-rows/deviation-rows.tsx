import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"

export interface DeviationRowsItem {
  id?: string
  label: ReactNode
  /** Printed under the label, usually the two raw figures being compared. */
  detail?: ReactNode
  /** The signed relative gap in percent (`12` is +12%). `null` when there is no baseline. */
  value: number | null
  /** Neither direction is better; drawn in the neutral tone. */
  neutral?: boolean
  /** Why the gap can't be read at face value. Forces the neutral tone. */
  caveat?: ReactNode
}

export interface DeviationRowsProps extends HTMLAttributes<HTMLDivElement> {
  rows: readonly DeviationRowsItem[]
  /** A short heading over the rows, also the list's accessible name when it is a string. */
  caption?: ReactNode
  /** The widest gap the rail shows, in percent. Defaults to the largest present, plus room. */
  max?: number
  /** For measures where a rise is bad. */
  invert?: boolean
  /** Prints the signed value. Defaults to `+12.3%`, and `2.4×` past a doubling. */
  format?: (value: number) => string
  /** Printed for rows without a value. */
  emptyLabel?: string
  /** Hide the "-30% to +30%" range readout. */
  hideRange?: boolean
}

type Tone = "positive" | "negative" | "neutral"

const barTone: Record<Tone, string> = {
  positive: "bg-kg-success",
  negative: "bg-kg-danger",
  neutral: "bg-kg-fg-faint/70",
}

const valueTone: Record<Tone, string> = {
  positive: "text-[color-mix(in_oklab,var(--kg-success)_80%,var(--kg-fg))]",
  negative: "text-[color-mix(in_oklab,var(--kg-danger)_75%,var(--kg-fg))]",
  neutral: "text-kg-fg-muted",
}

const barClass = [
  "kg-deviation-rows__bar absolute inset-y-0 my-auto h-[0.625rem] w-(--_size) rounded-[2px]",
  "animate-[kg-deviation-grow_var(--kg-duration-slower)_var(--kg-ease-out)_backwards] [animation-delay:calc(var(--_i,0)*40ms)]",
  "motion-reduce:animate-none in-data-[kg-motion=reduce]:animate-none",
].join(" ")

/* The axis and the zero line are the rail's pseudo-elements; only the bar is an element. */
const railClass = [
  "kg-deviation-rows__rail relative h-[1.5rem]",
  "before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-kg-border before:content-['']",
  "after:absolute after:inset-y-0 after:start-(--_pivot) after:w-px after:bg-kg-fg-faint after:content-['']",
].join(" ")

const signed = (value: number, digits = 1) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(digits)}%`

const defaultFormat = (value: number) =>
  value >= 100 ? `${(1 + value / 100).toFixed(1)}×` : signed(value)

/**
 * Signed gaps as bars that grow from zero, one row per item, with the figure in words beside
 * each bar. When every gap falls on one side the zero line moves to that edge, so the rail is
 * used in full. Server-safe.
 */
export const DeviationRows = forwardRef<HTMLDivElement, DeviationRowsProps>(
  (
    {
      rows,
      caption,
      max,
      invert = false,
      format = defaultFormat,
      emptyLabel = "n/a",
      hideRange = false,
      className,
      ...props
    },
    ref,
  ) => {
    const values = rows.flatMap((row) =>
      row.value === null || !Number.isFinite(row.value) ? [] : [row.value],
    )
    const reach = max ?? Math.max(5, ...values.map(Math.abs)) * 1.15
    const origin = values.every((v) => v >= 0)
      ? "start"
      : values.every((v) => v <= 0)
        ? "end"
        : "center"
    const pivot = origin === "start" ? 0 : origin === "end" ? 100 : 50
    const room = origin === "center" ? 50 : 100
    const multiples = values.some((v) => v >= 100)

    return (
      <div
        ref={ref}
        className={cx("kg-deviation-rows min-w-0 text-kg-sm text-kg-fg", className)}
        data-origin={origin}
        {...props}
      >
        {(caption != null || (!hideRange && !multiples)) && (
          <div className="kg-deviation-rows__head flex items-baseline justify-between gap-3 pb-2 text-kg-xs tabular-nums text-kg-fg-faint">
            <span className="kg-deviation-rows__caption">{caption}</span>
            {!hideRange && !multiples && (
              <span className="kg-deviation-rows__range">
                {origin === "start" ? signed(0, 0) : signed(-reach, 0)} to{" "}
                {origin === "end" ? signed(0, 0) : signed(reach, 0)}
              </span>
            )}
          </div>
        )}
        <ul
          className="kg-deviation-rows__list m-0 list-none p-0"
          aria-label={typeof caption === "string" ? caption : undefined}
        >
          {rows.map((row, index) => {
            const value = row.value !== null && Number.isFinite(row.value) ? row.value : null
            const size = value === null ? 0 : (Math.min(Math.abs(value), reach) / reach) * room
            const rising = (value ?? 0) >= 0
            const muted = Boolean(row.neutral || row.caveat)
            const tone: Tone =
              value === null || muted || Math.abs(value) < 0.05
                ? "neutral"
                : rising !== invert
                  ? "positive"
                  : "negative"
            return (
              <li
                key={row.id ?? index}
                className="kg-deviation-rows__row grid grid-cols-[minmax(5rem,14rem)_minmax(4rem,1fr)_4.5rem] items-center gap-3 border-b border-kg-border py-2 last:border-b-0"
                data-tone={tone}
                data-direction={rising ? "up" : "down"}
              >
                <div className="kg-deviation-rows__text grid min-w-0">
                  <span className="kg-deviation-rows__label truncate font-[560]">{row.label}</span>
                  {row.detail != null && (
                    <span className="kg-deviation-rows__detail text-kg-xs tabular-nums text-kg-fg-muted">
                      {row.detail}
                    </span>
                  )}
                  {row.caveat != null && (
                    <span className="kg-deviation-rows__caveat text-kg-xs text-[color-mix(in_oklab,var(--kg-warning)_45%,var(--kg-fg))]">
                      {row.caveat}
                    </span>
                  )}
                </div>
                <span
                  className={railClass}
                  aria-hidden="true"
                  style={{ "--_pivot": `${pivot}%` } as CSSProperties}
                >
                  <span
                    className={cx(
                      barClass,
                      barTone[tone],
                      rising
                        ? "start-(--_pivot) ltr:origin-left rtl:origin-right"
                        : "end-(--_rest) ltr:origin-right rtl:origin-left",
                    )}
                    style={
                      {
                        "--_size": `${size}%`,
                        "--_rest": `${100 - pivot}%`,
                        "--_i": index,
                      } as CSSProperties
                    }
                  />
                </span>
                <span className={cx("kg-deviation-rows__value text-end font-semibold tabular-nums", valueTone[tone])}>
                  {value === null ? emptyLabel : format(value)}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    )
  },
)

DeviationRows.displayName = "DeviationRows"
