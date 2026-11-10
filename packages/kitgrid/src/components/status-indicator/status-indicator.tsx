import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * Paper Layers: a solid tone dot carrying a glyph. The pill sets it on the status's paper colour
 * with an ink edge, so the label stays ink on paper.
 */
export const statusIndicatorVariants = variants({
  base: "kg-status-indicator inline-flex items-center font-[520] leading-[1.2] text-kg-fg whitespace-nowrap",
  variants: {
    status: {
      operational:
        "[--_tone:var(--kg-success)] [--_on:var(--kg-success-fg)] [--_paper:var(--kg-paper-sage)]",
      degraded:
        "[--_tone:var(--kg-warning)] [--_on:var(--kg-warning-fg)] [--_paper:var(--kg-paper-butter)]",
      partial:
        "[--_tone:color-mix(in_oklab,var(--kg-warning),var(--kg-danger)_45%)] [--_on:var(--kg-danger-fg)] [--_paper:var(--kg-paper-peach)]",
      outage:
        "[--_tone:var(--kg-danger)] [--_on:var(--kg-danger-fg)] [--_paper:var(--kg-paper-rose)]",
      maintenance:
        "[--_tone:var(--kg-info)] [--_on:var(--kg-info-fg)] [--_paper:var(--kg-paper-sky)]",
      unknown: "[--_tone:var(--kg-fg-faint)] [--_on:var(--kg-surface)] [--_paper:var(--kg-muted)]",
    },
    variant: {
      dot: "",
      pill: "py-1 ps-1.25 pe-2.5 rounded-full border-2 border-kg-ink bg-(--_paper)",
    },
    size: {
      sm: "gap-1.5 text-kg-xs [--_mark:0.75rem]",
      md: "gap-1.75 text-kg-sm [--_mark:0.875rem]",
    },
  },
  defaults: { variant: "dot", size: "md" },
})

type StatusIndicatorVariantProps = VariantProps<typeof statusIndicatorVariants>
export type StatusIndicatorStatus = NonNullable<StatusIndicatorVariantProps["status"]>
export type StatusIndicatorVariant = NonNullable<StatusIndicatorVariantProps["variant"]>
export type StatusIndicatorSize = NonNullable<StatusIndicatorVariantProps["size"]>

export interface StatusIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  status: StatusIndicatorStatus
  /** Overrides the default wording, e.g. "All systems normal". */
  label?: ReactNode
  variant?: StatusIndicatorVariant
  size?: StatusIndicatorSize
  /** A soft ring for live states. Removed under reduced motion. */
  pulse?: boolean
  /** Keeps the label for screen readers only. */
  hideLabel?: boolean
}

export const statusIndicatorWords: Record<StatusIndicatorStatus, string> = {
  operational: "Operational",
  degraded: "Degraded",
  partial: "Partial outage",
  outage: "Major outage",
  maintenance: "Maintenance",
  unknown: "Unknown",
}

/* A glyph per state so the meaning survives without colour. */
const glyphs: Record<StatusIndicatorStatus, string> = {
  operational: "M3.5 6.2 5.2 7.9 8.5 4.4",
  degraded: "M6 3.4v3.2M6 8.4v.1",
  partial: "M3.6 6h4.8",
  outage: "M4.2 4.2l3.6 3.6M7.8 4.2 4.2 7.8",
  maintenance: "M4 4.5h4M4 7.5h4",
  unknown: "M5 4.4a1.2 1.2 0 1 1 1.6 1.2c-.4.2-.6.5-.6.9M6 8.3v.1",
}

const mark = cx(
  "kg-status-indicator__mark relative grid shrink-0 place-items-center size-(--_mark) rounded-full",
  "bg-(--_tone) text-(color:--_on) [&_svg]:size-full",
  "data-pulse:after:absolute data-pulse:after:inset-0 data-pulse:after:rounded-[inherit]",
  "data-pulse:after:bg-(--_tone) data-pulse:after:opacity-55 data-pulse:after:animate-ping",
  "data-pulse:after:[animation-duration:2s]",
  "motion-reduce:after:hidden in-data-[kg-motion=reduce]:after:hidden",
)

/** Service health for one system: a shaped dot plus words. Server-safe. */
export const StatusIndicator = forwardRef<HTMLSpanElement, StatusIndicatorProps>(
  (
    {
      status,
      label,
      variant = "dot",
      size = "md",
      pulse = false,
      hideLabel = false,
      className,
      ...props
    },
    ref,
  ) => (
    <span
      ref={ref}
      className={statusIndicatorVariants({ status, variant, size, className })}
      data-status={status}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      <span className={mark} data-pulse={pulse || undefined} aria-hidden="true">
        <svg viewBox="0 0 12 12" fill="none">
          <path d={glyphs[status]} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className={hideLabel ? "kg-visually-hidden" : "kg-status-indicator__label min-w-0"}>
        {label ?? statusIndicatorWords[status]}
      </span>
    </span>
  ),
)

StatusIndicator.displayName = "StatusIndicator"
