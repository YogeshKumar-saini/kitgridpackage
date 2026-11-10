import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { type VariantProps, variants } from "../../utils/variants.js"

/* Paper Layers: each tier is a flat paper chip; pro is ink, enterprise a lifted butter sheet. */
export const planBadgeVariants = variants({
  base: [
    "kg-plan-badge inline-flex items-center rounded-full border-2",
    "font-[640] tracking-[0.02em] whitespace-nowrap",
  ],
  variants: {
    tier: {
      free: "border-kg-border bg-kg-muted text-kg-fg-muted",
      pro: "border-kg-ink bg-kg-accent text-kg-accent-fg",
      team: "border-kg-ink bg-kg-paper-sky text-kg-fg",
      enterprise: "border-kg-ink bg-kg-paper-butter text-kg-fg shadow-kg-xs",
    },
    size: {
      sm: "h-[1.125rem] px-1.75 text-[0.625rem]",
      md: "h-[1.375rem] px-2.25 text-[0.6875rem]",
    },
  },
  defaults: { size: "md" },
})

type PlanBadgeVariantProps = VariantProps<typeof planBadgeVariants>
export type PlanBadgeTier = NonNullable<PlanBadgeVariantProps["tier"]>
export type PlanBadgeSize = NonNullable<PlanBadgeVariantProps["size"]>

export interface PlanBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tier: PlanBadgeTier
  size?: PlanBadgeSize
  /** Defaults to the tier name. */
  children?: ReactNode
}

export const planBadgeWords: Record<PlanBadgeTier, string> = {
  free: "Free",
  pro: "Pro",
  team: "Team",
  enterprise: "Enterprise",
}

/** The plan a workspace is on, for menus, headers and settings rows. Server-safe. */
export const PlanBadge = forwardRef<HTMLSpanElement, PlanBadgeProps>(
  ({ tier, size = "md", children, className, ...props }, ref) => (
    <span
      ref={ref}
      className={planBadgeVariants({ tier, size, className })}
      data-tier={tier}
      data-size={size}
      {...props}
    >
      {children ?? planBadgeWords[tier]}
    </span>
  ),
)

PlanBadge.displayName = "PlanBadge"
