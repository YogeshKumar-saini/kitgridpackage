import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useId,
} from "react"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"

export type ProgressTone =
  "accent" | "neutral" | "success" | "warning" | "danger" | "info"
export type ProgressSize = "sm" | "md" | "lg"

interface ProgressBaseProps {
  /** Leave undefined (or set `indeterminate`) when the amount of work is unknown. */
  value?: number | null
  min?: number
  max?: number
  indeterminate?: boolean
  tone?: ProgressTone
  /** Overrides the default `"42%"` for both the visible value and aria-valuetext. */
  formatValue?: (value: number, min: number, max: number) => string
}

export interface ProgressProps
  extends ProgressBaseProps, HTMLAttributes<HTMLDivElement> {
  size?: ProgressSize
  /** Visible label; it also names the progressbar. */
  label?: ReactNode
  /** Show the formatted value next to the label. */
  showValue?: boolean
  striped?: boolean
  /** Moves the stripes. Stops under reduced motion. */
  animated?: boolean
}

export interface ProgressRingProps
  extends ProgressBaseProps, Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Names the ring for assistive technology, since it has no visible label. */
  label?: string
  /** Diameter in px. */
  size?: number
  /** Stroke width in px. */
  thickness?: number
  /** Show the formatted value in the centre. Ignored when `children` is set. */
  showValue?: boolean
  /** Custom centre content, such as an icon. */
  children?: ReactNode
}

const TONE: Record<ProgressTone, string> = {
  accent: "[--_tone:var(--kg-accent)] [--_tone-fg:var(--kg-accent-fg)] [--_track:color-mix(in_oklab,var(--kg-accent)_15%,var(--kg-muted))]",
  neutral: "[--_tone:var(--kg-fg)] [--_tone-fg:var(--kg-bg)] [--_track:var(--kg-muted)]",
  success: "[--_tone:var(--kg-success)] [--_tone-fg:var(--kg-success-fg)] [--_track:color-mix(in_oklab,var(--kg-success)_15%,var(--kg-muted))]",
  warning: "[--_tone:var(--kg-warning)] [--_tone-fg:var(--kg-warning-fg)] [--_track:color-mix(in_oklab,var(--kg-warning)_15%,var(--kg-muted))]",
  danger: "[--_tone:var(--kg-danger)] [--_tone-fg:var(--kg-danger-fg)] [--_track:color-mix(in_oklab,var(--kg-danger)_15%,var(--kg-muted))]",
  info: "[--_tone:var(--kg-info)] [--_tone-fg:var(--kg-info-fg)] [--_track:color-mix(in_oklab,var(--kg-info)_15%,var(--kg-muted))]",
}

const HEIGHT: Record<ProgressSize, string> = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
}

/*
 * Translating a full-width fill keeps its rounded leading edge, where scaleX would squash it.
 * Indeterminate motion is information and slows down; the stripes are decoration and stop.
 */
const indicator = (state: string, striped: boolean, animated: boolean) =>
  cx(
    "kg-progress__indicator absolute inset-y-0 start-0 rounded-[inherit] bg-(--_tone)",
    state === "indeterminate"
      ? [
          "w-[40%] animate-[kg-progress-sweep_1.5s_var(--kg-ease-in-out)_infinite]",
          "motion-reduce:[animation-duration:3.2s] [[data-kg-motion=reduce]_&]:[animation-duration:3.2s]",
        ]
      : [
          "w-full translate-x-[calc((var(--_value)-1)*100%)] rtl:translate-x-[calc((var(--_value)-1)*-100%)]",
          "transition-[translate] duration-[var(--kg-duration-slower)] ease-kg-out",
        ],
    striped &&
      "bg-[linear-gradient(45deg,var(--_stripe)_25%,transparent_25%,transparent_50%,var(--_stripe)_50%,var(--_stripe)_75%,transparent_75%,transparent)] bg-size-[1rem_1rem]",
    striped &&
      animated &&
      state !== "indeterminate" && [
        "animate-[kg-progress-stripes_0.9s_linear_infinite]",
        "motion-reduce:animate-none [[data-kg-motion=reduce]_&]:animate-none",
      ],
  )

const defaultFormat = (value: number, min: number, max: number) =>
  `${Math.round(((value - min) / (max - min || 1)) * 100)}%`

const resolve = ({
  value,
  min = 0,
  max = 100,
  indeterminate,
  formatValue,
}: ProgressBaseProps) => {
  const known = !indeterminate && typeof value === "number" && Number.isFinite(value)
  const current = known ? clamp(value, min, max) : min
  const ratio = (current - min) / (max - min || 1)
  const text = known ? (formatValue ?? defaultFormat)(current, min, max) : undefined
  const state = !known ? "indeterminate" : current >= max ? "complete" : "loading"
  return {
    known,
    ratio,
    text,
    state,
    aria: {
      role: "progressbar",
      "aria-valuemin": min,
      "aria-valuemax": max,
      "aria-valuenow": known ? current : undefined,
      "aria-valuetext": text,
    } as const,
  }
}

/**
 * A linear progress bar. The fill moves with a transform, so value changes glide without layout.
 * `useId` is available in Server Components, so this stays RSC-safe.
 */
export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      value,
      min,
      max,
      indeterminate,
      formatValue,
      tone = "accent",
      size = "md",
      label,
      showValue = false,
      striped = false,
      animated = false,
      className,
      style,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      ...props
    },
    ref,
  ) => {
    const labelId = useId()
    const { known, ratio, text, state, aria } = resolve({
      value,
      min,
      max,
      indeterminate,
      formatValue,
    })
    const hasHeader = label != null || (showValue && known)

    return (
      <div
        ref={ref}
        className={cx(
          "kg-progress grid w-full min-w-0 gap-2",
          TONE[tone] ?? TONE.accent,
          striped && "[--_stripe:color-mix(in_oklab,var(--_tone-fg)_22%,transparent)]",
          className,
        )}
        data-tone={tone}
        data-size={size}
        data-state={state}
        data-striped={striped || undefined}
        data-animated={(striped && animated) || undefined}
        style={{ "--_value": ratio, ...style } as CSSProperties}
        {...props}
      >
        {hasHeader && (
          <div className="kg-progress__header flex items-baseline justify-between gap-3 text-kg-sm leading-[1.3]">
            {label != null && (
              <span id={labelId} className="kg-progress__label min-w-0 font-semibold text-kg-fg">
                {label}
              </span>
            )}
            {showValue && known && (
              <span
                className="kg-progress__value ms-auto tabular-nums text-kg-fg-muted"
                aria-hidden="true"
              >
                {text}
              </span>
            )}
          </div>
        )}
        <div
          {...aria}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy ?? (label != null ? labelId : undefined)}
          className={cx(
            "kg-progress__track relative overflow-hidden rounded-full bg-(--_track)",
            HEIGHT[size] ?? HEIGHT.md,
          )}
        >
          <div className={indicator(state, striped, animated)} />
        </div>
      </div>
    )
  },
)

Progress.displayName = "Progress"

/** A circular progress indicator drawn with an SVG stroke. RSC-safe. */
export const ProgressRing = forwardRef<HTMLDivElement, ProgressRingProps>(
  (
    {
      value,
      min,
      max,
      indeterminate,
      formatValue,
      tone = "accent",
      size = 56,
      thickness = 5,
      showValue = true,
      label,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const { known, ratio, text, state, aria } = resolve({
      value,
      min,
      max,
      indeterminate,
      formatValue,
    })
    const radius = (size - thickness) / 2
    const centre = children ?? (showValue && known ? text : null)

    return (
      <div
        ref={ref}
        {...aria}
        aria-label={label}
        className={cx(
          "kg-progress-ring relative inline-grid size-(--_size) shrink-0 place-items-center align-middle",
          TONE[tone] ?? TONE.accent,
          className,
        )}
        data-tone={tone}
        data-state={state}
        data-empty={(known && ratio === 0) || undefined}
        style={
          {
            "--_size": `${size}px`,
            "--_offset": known ? 100 - ratio * 100 : 75,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <svg
          className={cx(
            "block size-full -rotate-90 overflow-visible",
            state === "indeterminate" &&
              "animate-spin [animation-duration:0.9s] motion-reduce:[animation-duration:2.4s] [[data-kg-motion=reduce]_&]:[animation-duration:2.4s]",
          )}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
        >
          <circle
            className="kg-progress-ring__track fill-none stroke-(color:--_track)"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={thickness}
          />
          <circle
            className={cx(
              "kg-progress-ring__indicator fill-none stroke-(color:--_tone) [stroke-dasharray:100] [stroke-dashoffset:calc(var(--_offset)*1px)] [stroke-linecap:round]",
              "transition-[stroke-dashoffset] duration-[var(--kg-duration-slower)] ease-kg-out",
              known && ratio === 0 && "opacity-0",
            )}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={thickness}
            pathLength={100}
          />
        </svg>
        {centre != null && (
          <span
            className="kg-progress-ring__label absolute inline-flex text-[length:max(0.625rem,calc(var(--_size)*0.24))] font-semibold leading-none tracking-[-0.01em] tabular-nums text-kg-fg [&_svg]:size-[calc(var(--_size)*0.38)]"
            aria-hidden="true"
          >
            {centre}
          </span>
        )}
      </div>
    )
  },
)

ProgressRing.displayName = "ProgressRing"
