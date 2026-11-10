import { cx } from "../../utils/cx.js"
import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * Paper Layers: a badge is a round paper chip with ink text. --_paper is the soft fill,
 * --_tone the solid fill and dot, --_tone-fg the text on that solid fill.
 */
export const badgeVariants = variants({
  base: [
    "kg-badge inline-flex items-center rounded-full border-2 align-middle",
    "font-semibold leading-none tracking-[0.005em] tabular-nums whitespace-nowrap",
  ],
  variants: {
    tone: {
      neutral: "[--_paper:var(--kg-muted)] [--_tone:var(--kg-fg)] [--_tone-fg:var(--kg-bg)] [--_dot:var(--kg-fg-muted)]",
      accent: "[--_paper:var(--kg-paper-sage)] [--_tone:var(--kg-accent)] [--_tone-fg:var(--kg-accent-fg)] [--_dot:var(--kg-ink)]",
      success: "[--_paper:var(--kg-paper-sage)] [--_tone:var(--kg-success)] [--_tone-fg:var(--kg-success-fg)] [--_dot:var(--kg-success)]",
      warning: "[--_paper:var(--kg-paper-butter)] [--_tone:var(--kg-warning)] [--_tone-fg:var(--kg-warning-fg)] [--_dot:var(--kg-warning)]",
      danger: "[--_paper:var(--kg-paper-rose)] [--_tone:var(--kg-danger)] [--_tone-fg:var(--kg-danger-fg)] [--_dot:var(--kg-danger)]",
      info: "[--_paper:var(--kg-paper-sky)] [--_tone:var(--kg-info)] [--_tone-fg:var(--kg-info-fg)] [--_dot:var(--kg-info)]",
      sage: "[--_paper:var(--kg-paper-sage)] [--_tone:var(--kg-paper-sage)] [--_tone-fg:var(--kg-fg)] [--_dot:var(--kg-ink)]",
      peach: "[--_paper:var(--kg-paper-peach)] [--_tone:var(--kg-paper-peach)] [--_tone-fg:var(--kg-fg)] [--_dot:var(--kg-ink)]",
      sky: "[--_paper:var(--kg-paper-sky)] [--_tone:var(--kg-paper-sky)] [--_tone-fg:var(--kg-fg)] [--_dot:var(--kg-ink)]",
      butter: "[--_paper:var(--kg-paper-butter)] [--_tone:var(--kg-paper-butter)] [--_tone-fg:var(--kg-fg)] [--_dot:var(--kg-ink)]",
      rose: "[--_paper:var(--kg-paper-rose)] [--_tone:var(--kg-paper-rose)] [--_tone-fg:var(--kg-fg)] [--_dot:var(--kg-ink)]",
    },
    variant: {
      soft: "border-transparent bg-(--_paper) text-kg-fg",
      solid: "border-kg-ink bg-(--_tone) text-(--_tone-fg) [--_dot:currentColor]",
      outline: "border-kg-ink bg-transparent text-kg-fg",
    },
    size: {
      sm: "h-[1.125rem] gap-1 px-1.5 text-[0.6875rem]",
      md: "h-6 gap-1.25 px-2 text-kg-xs",
    },
  },
  defaults: { tone: "neutral", variant: "soft", size: "md" },
})

type BadgeVariantProps = VariantProps<typeof badgeVariants>
export type BadgeTone = NonNullable<BadgeVariantProps["tone"]>
export type BadgeVariant = NonNullable<BadgeVariantProps["variant"]>
export type BadgeSize = NonNullable<BadgeVariantProps["size"]>

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** A status tone, or one of the category papers (sage, peach, sky, butter, rose). */
  tone?: BadgeTone
  variant?: BadgeVariant
  size?: BadgeSize
  /** A leading status dot in the tone color. */
  dot?: boolean
  /** Adds a soft ping around the dot for live states. Removed under reduced motion. */
  pulse?: boolean
  /** Decorative leading icon; the text stays the accessible name. */
  icon?: ReactNode
}

/** A compact label for status, counts and merchandising flags such as “New” or “−20%”. */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      tone = "neutral",
      variant = "soft",
      size = "md",
      dot = false,
      pulse = false,
      icon,
      className,
      children,
      ...props
    },
    ref,
  ) => (
    <span
      ref={ref}
      className={badgeVariants({ tone, variant, size, className })}
      data-tone={tone}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {dot && (
        <span
          className={cx(
            "kg-badge__dot relative size-1.5 shrink-0 rounded-full bg-(--_dot)",
            pulse &&
              "after:absolute after:inset-0 after:animate-ping after:rounded-full after:bg-inherit motion-reduce:after:hidden",
          )}
          data-pulse={pulse || undefined}
          aria-hidden="true"
        />
      )}
      {icon != null && (
        <span
          className="kg-badge__icon -ms-px inline-flex [&_svg]:size-[1.1em]"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      {children}
    </span>
  ),
)

Badge.displayName = "Badge"
