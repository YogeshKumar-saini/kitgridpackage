import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"
import { type VariantProps, variants } from "../../utils/variants.js"

const emptyStateVariants = variants({
  base: "kg-empty-state flex flex-col items-center text-center text-kg-fg",
  variants: {
    variant: {
      default: "",
      dashed: "rounded-kg-xl border-2 border-dashed border-kg-border-strong bg-kg-surface-sunken",
    },
    size: {
      sm: "gap-4 px-4.5 py-6",
      md: "gap-5 px-7.5 py-10",
      lg: "gap-6 px-12 py-16",
    },
  },
  defaults: { variant: "default", size: "md" },
})

/* Paper Layers: the icon sits on a round sage sheet with an ink edge and offset. */
const ICON = {
  sm: "size-10",
  md: "size-12",
  lg: "size-14",
}

const TITLE = {
  sm: "text-kg-base",
  md: "text-kg-md",
  lg: "text-kg-lg",
}

type EmptyStateVariantProps = VariantProps<typeof emptyStateVariants>
export type EmptyStateVariant = NonNullable<EmptyStateVariantProps["variant"]>
export type EmptyStateSize = NonNullable<EmptyStateVariantProps["size"]>
export type EmptyStateTitleElement = "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "div"

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Decorative; shown on a round paper tile. */
  icon?: ReactNode
  title: ReactNode
  /** Pick the level that fits the page outline. */
  titleAs?: EmptyStateTitleElement
  description?: ReactNode
  /** The next step, usually one primary and one secondary button. */
  actions?: ReactNode
  variant?: EmptyStateVariant
  size?: EmptyStateSize
}

/** What a list, table or cart shows when there is nothing in it yet. Server-safe. */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      icon,
      title,
      titleAs: Title = "h3",
      description,
      actions,
      variant = "default",
      size = "md",
      className,
      children,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={emptyStateVariants({ variant, size, className })}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {icon != null && (
        <span
          className={cx(
            "kg-empty-state__icon grid shrink-0 place-items-center rounded-full border-2 border-kg-ink bg-kg-paper-sage text-kg-fg shadow-kg-sm [&_svg]:size-[45%]",
            ICON[size] ?? ICON.md,
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <div className="kg-empty-state__text grid max-w-[26rem] justify-items-center gap-1.5">
        <Title
          className={cx(
            "kg-empty-state__title m-0 font-semibold leading-[1.3] tracking-[-0.012em] text-balance",
            TITLE[size] ?? TITLE.md,
          )}
        >
          {title}
        </Title>
        {description != null && (
          <p
            className={cx(
              "kg-empty-state__description m-0 leading-[1.55] text-pretty text-kg-fg-muted",
              size === "sm" ? "text-kg-sm" : "text-kg-base",
            )}
          >
            {description}
          </p>
        )}
      </div>
      {actions != null && (
        <div className="kg-empty-state__actions flex flex-wrap items-center justify-center gap-2">
          {actions}
        </div>
      )}
      {children}
    </div>
  ),
)

EmptyState.displayName = "EmptyState"
