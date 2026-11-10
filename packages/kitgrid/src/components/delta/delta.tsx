import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { variants } from "../../utils/variants.js"

export type DeltaDirection = "up" | "down" | "flat"
export type DeltaTone = "positive" | "negative" | "neutral"
export type DeltaSize = "sm" | "md" | "lg"
export type DeltaVariant = "plain" | "pill"
export type DeltaUnit = "percent" | "points" | "number"

export interface DeltaLabels {
  up?: string
  down?: string
  flat?: string
}

export interface DeltaProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The signed change. `12` reads as 12% with the default `percent` unit. */
  value: number
  /** `points` prints `pp` for a change between two shares; `number` prints the bare figure. */
  unit?: DeltaUnit
  /** For metrics where a rise is bad, such as churn, cost or latency. */
  invert?: boolean
  /** Shows direction without a verdict: the arrow turns, the colour stays neutral. */
  neutral?: boolean
  /** Changes smaller than this, in absolute terms, read as no change. */
  threshold?: number
  /** Fraction digits for the default format. */
  precision?: number
  /** Overrides the printed magnitude. Receives the absolute value. */
  format?: (magnitude: number) => string
  /** Words read before the figure, since the arrow alone is visual. */
  labels?: DeltaLabels
  /** Context such as "vs last week", printed after the figure. */
  caption?: ReactNode
  size?: DeltaSize
  variant?: DeltaVariant
}

const defaultLabels: Required<DeltaLabels> = { up: "up", down: "down", flat: "no change" }

const suffix: Record<DeltaUnit, string> = { percent: "%", points: "pp", number: "" }

export const deltaDirection = (value: number, threshold = 0): DeltaDirection =>
  !Number.isFinite(value) || Math.abs(value) <= threshold || value === 0
    ? "flat"
    : value > 0
      ? "up"
      : "down"

export const deltaTone = (
  direction: DeltaDirection,
  invert = false,
  neutral = false,
): DeltaTone =>
  direction === "flat" || neutral
    ? "neutral"
    : (direction === "up") !== invert
      ? "positive"
      : "negative"

const deltaVariants = variants({
  base: "kg-delta inline-flex items-baseline gap-1.5 text-(length:--_text) leading-[1.3] whitespace-nowrap",
  variants: {
    size: {
      sm: "[--_icon:0.75rem] [--_text:var(--kg-text-xs)]",
      md: "[--_icon:0.875rem] [--_text:var(--kg-text-sm)]",
      lg: "[--_icon:1rem] [--_text:var(--kg-text-base)]",
    },
  },
})

/* Plain figures mix the tone into the text colour so they stay AA; pills sit on paper in ink. */
const figureVariants = variants({
  base: "kg-delta__figure inline-flex items-center gap-0.5 self-center font-[620] tabular-nums",
  variants: {
    variant: {
      plain: "",
      pill: "h-[calc(var(--_text)*1.75)] rounded-full ps-[0.3125rem] pe-[0.4375rem] text-kg-fg",
    },
    tone: {
      positive: "",
      negative: "",
      neutral: "",
    },
  },
  compound: [
    { variant: "plain", tone: "positive", class: "text-[color-mix(in_oklab,var(--kg-success)_78%,var(--kg-fg))]" },
    { variant: "plain", tone: "negative", class: "text-[color-mix(in_oklab,var(--kg-danger)_70%,var(--kg-fg))]" },
    { variant: "plain", tone: "neutral", class: "text-kg-fg-muted" },
    { variant: "pill", tone: "positive", class: "bg-kg-paper-sage" },
    { variant: "pill", tone: "negative", class: "bg-kg-paper-rose" },
    { variant: "pill", tone: "neutral", class: "bg-kg-muted" },
  ],
})

export const DeltaArrow = ({ direction }: { direction: DeltaDirection }) => (
  <svg
    className="kg-delta__arrow size-(--_icon,0.875rem) shrink-0"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {direction === "flat" ? (
      <path d="M3.5 8h9" />
    ) : direction === "up" ? (
      <path d="M8 12.5v-9M4 7.5l4-4 4 4" />
    ) : (
      <path d="M8 3.5v9M4 8.5l4 4 4-4" />
    )}
  </svg>
)

/**
 * A signed change: arrow, magnitude and a spoken direction, toned by whether the move is good.
 * Colour is never the only channel. Server-safe and locale-free, so SSR and hydration agree.
 */
export const Delta = forwardRef<HTMLSpanElement, DeltaProps>(
  (
    {
      value,
      unit = "percent",
      invert = false,
      neutral = false,
      threshold = 0,
      precision = 1,
      format,
      labels,
      caption,
      size = "md",
      variant = "plain",
      className,
      ...props
    },
    ref,
  ) => {
    const direction = deltaDirection(value, threshold)
    const tone = deltaTone(direction, invert, neutral)
    const magnitude = direction === "flat" ? 0 : Math.abs(value)
    const text = format
      ? format(magnitude)
      : `${magnitude.toFixed(precision)}${suffix[unit]}`
    const words = { ...defaultLabels, ...labels }

    return (
      <span
        ref={ref}
        className={deltaVariants({ size, className })}
        data-direction={direction}
        data-tone={tone}
        data-size={size}
        data-variant={variant}
        {...props}
      >
        <span className={figureVariants({ variant, tone })}>
          <DeltaArrow direction={direction} />
          <span className="kg-visually-hidden">{words[direction]} </span>
          <span className="kg-delta__value">{text}</span>
        </span>
        {caption != null && <span className="kg-delta__caption font-normal whitespace-normal text-kg-fg-muted">{caption}</span>}
      </span>
    )
  },
)

Delta.displayName = "Delta"
