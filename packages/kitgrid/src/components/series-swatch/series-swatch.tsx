import { type CSSProperties, forwardRef, type HTMLAttributes } from "react"
import { cx } from "../../utils/cx.js"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * `--kg-series-N` lets a theme supply a chart palette; without one, the accent, status hues and
 * ink steps keep series apart.
 */
const palette = [
  "[--_color:var(--kg-series-1,var(--kg-accent))]",
  "[--_color:var(--kg-series-2,var(--kg-info))]",
  "[--_color:var(--kg-series-3,var(--kg-success))]",
  "[--_color:var(--kg-series-4,var(--kg-warning))]",
  "[--_color:var(--kg-series-5,var(--kg-danger))]",
  "[--_color:var(--kg-series-6,var(--kg-fg-muted))]",
  "[--_color:var(--kg-series-7,var(--kg-accent-strong))]",
  "[--_color:var(--kg-series-8,var(--kg-fg-faint))]",
]

const markVariants = variants({
  base: "kg-series-swatch__mark shrink-0",
  variants: {
    shape: {
      dot: "size-[0.625rem] rounded-full bg-(--_color)",
      square: "size-[0.625rem] rounded-kg-xs bg-(--_color)",
      line: "h-[2px] w-[0.875rem] bg-(--_color)",
      dash: "h-[2px] w-[0.875rem] bg-[repeating-linear-gradient(90deg,var(--_color)_0_4px,transparent_4px_6px)]",
      area: "h-[0.625rem] w-[0.875rem] rounded-[1px] border-t-2 border-(--_color) bg-(--_color)/28",
    },
  },
  defaults: { shape: "dot" },
})

export type SeriesSwatchShape = NonNullable<VariantProps<typeof markVariants>["shape"]>

export interface SeriesSwatchProps extends HTMLAttributes<HTMLSpanElement> {
  shape?: SeriesSwatchShape
  /** Position in the series palette, from 0. Ignored when `color` is set. */
  index?: number
  /** Any CSS color, e.g. `var(--kg-info)`. */
  color?: string
}

/**
 * Carries a series' identity beside its label, so the label itself stays in the text colour.
 * The mark is decorative; the children are the accessible label. Server-safe.
 */
export const SeriesSwatch = forwardRef<HTMLSpanElement, SeriesSwatchProps>(
  ({ shape = "dot", index = 0, color, className, style, children, ...props }, ref) => {
    const slot = color ? undefined : Math.abs(Math.trunc(index)) % 8
    return (
      <span
        ref={ref}
        className={cx(
          "kg-series-swatch inline-flex min-w-0 items-center gap-1.5 text-kg-sm leading-[1.3] text-kg-fg",
          slot === undefined ? undefined : palette[slot],
          className,
        )}
        data-shape={shape}
        data-index={slot}
        style={color ? ({ ...style, "--_color": color } as CSSProperties) : style}
        {...props}
      >
        <span className={markVariants({ shape })} aria-hidden="true" />
        {children}
      </span>
    )
  },
)

SeriesSwatch.displayName = "SeriesSwatch"
