import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode, useId } from "react"
import { cx } from "../../utils/cx.js"
import { type VariantProps, variants } from "../../utils/variants.js"

/* Paper Layers: a flat ink fill on a muted track; past the limit the fill turns to a hatch. */
export const quotaBarVariants = variants({
  base: "kg-quota-bar group/quota grid min-w-0",
  variants: {
    size: {
      sm: "gap-1.5 [--_track:0.3125rem]",
      md: "gap-2 [--_track:0.5rem]",
    },
    level: {
      ok: "[--_tone:var(--kg-accent)]",
      warning: "[--_tone:var(--kg-warning)]",
      exceeded: "[--_tone:var(--kg-danger)]",
    },
  },
  defaults: { size: "md", level: "ok" },
})

type QuotaBarVariantProps = VariantProps<typeof quotaBarVariants>
export type QuotaBarSize = NonNullable<QuotaBarVariantProps["size"]>
export type QuotaBarLevel = NonNullable<QuotaBarVariantProps["level"]>

export interface QuotaBarProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  label: ReactNode
  used: number
  limit: number
  /** Formats both numbers, e.g. bytes to "4.2 GB". */
  format?: (value: number) => string
  /** Fraction of the limit where the bar turns to warning. */
  warnAt?: number
  size?: QuotaBarSize
  /** Replaces the "used / limit" readout. */
  valueText?: ReactNode
}

const defaultFormat = (value: number) => new Intl.NumberFormat().format(value)

export const quotaBarLevel = (used: number, limit: number, warnAt = 0.8): QuotaBarLevel => {
  if (limit <= 0 || used >= limit) return "exceeded"
  return used / limit >= warnAt ? "warning" : "ok"
}

/** A usage meter against a plan limit, turning amber near it and red past it. Server-safe. */
export const QuotaBar = forwardRef<HTMLDivElement, QuotaBarProps>(
  (
    { label, used, limit, format = defaultFormat, warnAt = 0.8, size = "md", valueText, className, style, ...props },
    ref,
  ) => {
    const labelId = useId()
    const level = quotaBarLevel(used, limit, warnAt)
    const fraction = limit > 0 ? Math.min(used / limit, 1) : 1
    const text = `${format(used)} of ${format(limit)}`
    return (
      <div
        ref={ref}
        className={quotaBarVariants({ size, level, className })}
        data-level={level}
        data-size={size}
        style={{ "--_fill": fraction, ...style } as CSSProperties}
        {...props}
      >
        <div
          className={cx(
            "kg-quota-bar__head flex items-baseline justify-between gap-3 min-w-0",
            size === "sm" ? "text-kg-xs" : "text-kg-sm",
          )}
        >
          <span
            id={labelId}
            className="kg-quota-bar__label min-w-0 overflow-hidden font-[520] whitespace-nowrap text-ellipsis text-kg-fg"
          >
            {label}
          </span>
          <span
            className={cx(
              "kg-quota-bar__value shrink-0 tabular-nums text-kg-fg-faint [&_strong]:font-semibold",
              level === "exceeded" ? "[&_strong]:text-kg-danger" : "[&_strong]:text-kg-fg",
            )}
          >
            {valueText ?? (
              <>
                <strong>{format(used)}</strong> / {format(limit)}
              </>
            )}
          </span>
        </div>
        <div
          className="kg-quota-bar__track relative h-(--_track) overflow-hidden rounded-full bg-kg-muted"
          role="meter"
          aria-labelledby={labelId}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={Math.min(used, limit)}
          aria-valuetext={level === "exceeded" ? `${text}, limit reached` : text}
        >
          <span
            className={cx(
              "kg-quota-bar__fill absolute inset-0 rounded-[inherit] bg-(--_tone)",
              "scale-x-(--_fill) origin-left rtl:origin-right",
              "transition-[scale] duration-(--kg-duration-slower) ease-kg-out",
              "group-data-[level=exceeded]/quota:bg-[repeating-linear-gradient(-45deg,transparent_0_6px,color-mix(in_oklab,var(--kg-danger),var(--kg-mix-strong)_18%)_6px_12px)]",
            )}
          />
        </div>
      </div>
    )
  },
)

QuotaBar.displayName = "QuotaBar"
