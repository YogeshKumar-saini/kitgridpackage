import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"
import { Delta, type DeltaProps } from "../delta/delta.js"

export type ReadoutSize = "sm" | "md" | "lg" | "xl"
export type ReadoutLayout = "stacked" | "compact" | "inline"

export interface ReadoutProps extends HTMLAttributes<HTMLDListElement> {
  label: ReactNode
  /** The figure. Pass a formatted string, or a `<Counter>` to animate changes. */
  value: ReactNode
  /** A quieter suffix such as `ms`, `GB` or `/ mo`. */
  unit?: ReactNode
  /** Signed change shown with a `<Delta>`. */
  delta?: number
  /** Everything a `<Delta>` takes except its value: invert, unit, caption… */
  deltaProps?: Omit<DeltaProps, "value">
  /** Context under the figure, such as "vs last 7 days". */
  caption?: ReactNode
  /** Something before the label: a `<SeriesSwatch>` or an icon. */
  marker?: ReactNode
  size?: ReadoutSize
  /**
   * `stacked` puts each part on its own line, `compact` tucks the delta beside the value,
   * `inline` puts label and value on one line for lists.
   */
  layout?: ReadoutLayout
}

const valueSize: Record<ReadoutSize, string> = {
  sm: "[--_value:var(--kg-text-md)]",
  md: "[--_value:var(--kg-text-xl)]",
  lg: "[--_value:var(--kg-text-2xl)]",
  xl: "[--_value:var(--kg-text-3xl)]",
}

const stackGap: Record<ReadoutSize, string> = { sm: "gap-1", md: "gap-1.5", lg: "gap-1.5", xl: "gap-2" }

/**
 * A labelled figure: label, big value, delta and caption. Rendered as a description list so
 * the label stays paired with the value for screen readers. Server-safe.
 */
export const Readout = forwardRef<HTMLDListElement, ReadoutProps>(
  (
    {
      label,
      value,
      unit,
      delta,
      deltaProps,
      caption,
      marker,
      size = "lg",
      layout = "stacked",
      className,
      ...props
    },
    ref,
  ) => {
    const inline = layout === "inline"
    const deltaNode =
      typeof delta === "number" && Number.isFinite(delta) ? (
        <Delta
          value={delta}
          size={size === "sm" || layout === "inline" ? "sm" : "md"}
          {...deltaProps}
        />
      ) : null
    return (
      <dl
        ref={ref}
        className={cx(
          "kg-readout m-0 grid min-w-0 content-start [&>dd]:m-0 [&>dd]:min-w-0",
          inline
            ? cx("grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 [--_value:var(--kg-text-base)]", stackGap[size])
            : cx(
                "grid-cols-[minmax(0,1fr)]",
                valueSize[size],
                layout === "compact" ? "gap-1" : stackGap[size],
              ),
          className,
        )}
        data-size={size}
        data-layout={layout}
        {...props}
      >
        <dt
          className={cx(
            "kg-readout__label flex min-w-0 items-center gap-1.5 font-[560] leading-[1.3] tracking-[0.01em] text-kg-fg-muted",
            inline ? "text-kg-sm" : "text-kg-xs",
          )}
        >
          {marker != null && (
            <span className="kg-readout__marker inline-flex shrink-0 text-kg-fg-faint [&_svg]:size-[0.875rem]">
              {marker}
            </span>
          )}
          {label}
        </dt>
        <dd
          className={cx(
            "kg-readout__value flex flex-wrap items-baseline gap-x-2 text-(length:--_value) leading-[1.1] tabular-nums text-kg-fg",
            "[&>.kg-delta]:self-center [&>.kg-delta]:tracking-normal",
            inline ? "col-start-2 row-start-1 font-semibold tracking-normal" : "font-[640] tracking-[-0.025em]",
          )}
        >
          <span className="kg-readout__figure min-w-0 wrap-anywhere">{value}</span>
          {unit != null && (
            <span className="kg-readout__unit -ms-1.25 text-[length:max(var(--kg-text-xs),calc(var(--_value)*0.5))] font-medium tracking-normal text-kg-fg-muted">
              {unit}
            </span>
          )}
          {layout !== "stacked" && deltaNode}
        </dd>
        {layout === "stacked" && deltaNode && (
          <dd className="kg-readout__delta">{deltaNode}</dd>
        )}
        {caption != null && (
          <dd
            className={cx(
              "kg-readout__caption text-kg-xs leading-[1.4] text-kg-fg-faint",
              inline && "col-span-full",
            )}
          >
            {caption}
          </dd>
        )}
      </dl>
    )
  },
)

Readout.displayName = "Readout"
