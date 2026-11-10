import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * Paper Layers: the marker's shape carries the status as well as its colour, so it reads
 * without colour vision: circle (ok), square (busy/danger), diamond (away/warning), ring
 * (offline), bullseye (info).
 */
const statusDotVariants = variants({
  base: "kg-status-dot inline-flex items-center gap-1.5 align-middle leading-[1.3] text-kg-fg-muted",
  variants: {
    status: {
      online: "[--_tone:var(--kg-success)]",
      success: "[--_tone:var(--kg-success)]",
      busy: "[--_tone:var(--kg-danger)]",
      danger: "[--_tone:var(--kg-danger)]",
      away: "[--_tone:var(--kg-warning)]",
      warning: "[--_tone:var(--kg-warning)]",
      offline: "[--_tone:var(--kg-fg-faint)]",
      info: "[--_tone:var(--kg-info)]",
    },
    size: {
      sm: "text-kg-xs [--_size:0.4375rem]",
      md: "text-kg-sm [--_size:0.5625rem]",
      lg: "text-kg-base [--_size:0.6875rem]",
    },
  },
  defaults: { status: "online", size: "md" },
})

const shapes: Record<StatusDotStatus, string> = {
  online: "rounded-full bg-(--_tone)",
  success: "rounded-full bg-(--_tone)",
  busy: "rounded-[2px] bg-(--_tone)",
  danger: "rounded-[2px] bg-(--_tone)",
  away: "scale-[0.85] rotate-45 rounded-[1px] bg-(--_tone)",
  warning: "scale-[0.85] rotate-45 rounded-[1px] bg-(--_tone)",
  offline: "rounded-full border-2 border-(--_tone) bg-transparent",
  info: "m-[2.5px] scale-75 rounded-full bg-(--_tone) outline-[1.5px] outline-offset-[1.5px] outline-solid outline-(--_tone)",
}

type StatusDotVariantProps = VariantProps<typeof statusDotVariants>
export type StatusDotStatus = NonNullable<StatusDotVariantProps["status"]>
export type StatusDotSize = NonNullable<StatusDotVariantProps["size"]>

export interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  status?: StatusDotStatus
  /** Visible text beside the dot. Without it, pass `label` so the state is still announced. */
  children?: ReactNode
  /** Accessible name for a dot shown on its own. */
  label?: string
  /** A slow ripple for live states. Removed under reduced motion. */
  pulse?: boolean
  size?: StatusDotSize
}

/** A status marker that always carries its meaning in text and shape, never in colour alone. */
export const StatusDot = forwardRef<HTMLSpanElement, StatusDotProps>(
  (
    { status = "online", children, label, pulse = false, size = "md", className, ...props },
    ref,
  ) => {
    const standalone = children == null
    return (
      <span
        ref={ref}
        className={statusDotVariants({ status, size, className })}
        data-status={status}
        data-size={size}
        data-pulse={pulse || undefined}
        role={standalone ? "img" : undefined}
        aria-label={standalone ? (label ?? status) : undefined}
        {...props}
      >
        <span
          className={`kg-status-dot__dot relative size-(--_size) flex-none ${shapes[status]}${
            pulse
              ? " before:absolute before:-inset-[2px] before:rounded-[inherit] before:bg-(--_tone) before:opacity-40 before:animate-ping before:[animation-duration:2.4s] motion-reduce:before:hidden [[data-kg-motion=reduce]_&]:before:hidden"
              : ""
          }`}
          aria-hidden="true"
        />
        {!standalone && <span className="kg-status-dot__label text-kg-fg">{children}</span>}
      </span>
    )
  },
)
StatusDot.displayName = "StatusDot"
