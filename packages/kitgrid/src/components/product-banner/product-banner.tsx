"use client"

import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { variants } from "../../utils/variants.js"

/* Paper Layers: a sheet of tone paper in an ink edge, with a leading strip of the tone itself. */
const bannerVariants = variants({
  base: [
    "kg-product-banner relative flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 overflow-hidden py-2.5 ps-4.5 pe-3",
    "rounded-kg-lg border-2 border-kg-ink text-kg-fg shadow-kg-sm",
    "before:absolute before:inset-y-0 before:start-0 before:w-1.5 before:border-e-2 before:border-kg-ink before:content-['']",
    "animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)] motion-reduce:animate-none",
  ],
  variants: {
    tone: {
      neutral: "bg-kg-surface before:bg-kg-muted",
      accent: "bg-kg-paper-sage before:bg-kg-accent",
      info: "bg-kg-paper-sky before:bg-kg-info",
      success: "bg-kg-paper-sage before:bg-kg-success",
      warning: "bg-kg-paper-butter before:bg-kg-warning",
      danger: "bg-kg-paper-rose before:bg-kg-danger",
    },
  },
  defaults: { tone: "accent" },
})

export type ProductBannerTone = "neutral" | "accent" | "info" | "success" | "warning" | "danger"

export interface ProductBannerProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode
  /** One short line after the title. */
  description?: ReactNode
  tone?: ProductBannerTone
  icon?: ReactNode
  /** Buttons or links on the trailing edge. */
  action?: ReactNode
  /** Adds a close button. */
  dismissible?: boolean
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  dismissLabel?: string
}

/**
 * An inline banner inside the product: a plan limit, a migration, a beta. Not a page-top
 * announcement bar; it sits in the content flow and can carry an action.
 */
export const ProductBanner = forwardRef<HTMLDivElement, ProductBannerProps>(
  (
    {
      title,
      description,
      tone = "accent",
      icon,
      action,
      dismissible = false,
      open: openProp,
      defaultOpen = true,
      onOpenChange,
      dismissLabel = "Dismiss",
      className,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = useControllableState({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    })
    if (!open) return null
    return (
      <div
        ref={ref}
        className={bannerVariants({ tone, className })}
        data-tone={tone}
        {...props}
      >
        {icon != null && (
          <span
            className="kg-product-banner__icon grid shrink-0 place-items-center text-kg-fg [&_svg]:size-4.5"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <p className="kg-product-banner__text m-0 min-w-0 flex-[1_1_16rem] text-kg-sm leading-[1.45] text-kg-fg">
          <strong className="kg-product-banner__title font-semibold">{title}</strong>
          {description != null && (
            <span className="kg-product-banner__description"> {description}</span>
          )}
        </p>
        {action != null && <div className="kg-product-banner__action flex shrink-0 items-center gap-2">{action}</div>}
        {dismissible && (
          <button
            type="button"
            className={[
              "kg-product-banner__dismiss grid size-7 shrink-0 cursor-pointer place-items-center rounded-kg-sm border-0 bg-transparent p-0",
              "text-kg-fg transition-colors duration-(--kg-duration-fast) ease-kg-out interactive:hover:bg-kg-surface [&_svg]:size-4",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
            ].join(" ")}
            aria-label={dismissLabel}
            onClick={() => setOpen(false)}
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="m4.5 4.5 7 7m0-7-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    )
  },
)

ProductBanner.displayName = "ProductBanner"
