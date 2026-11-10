import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * Paper Layers: solid and outline are ink-edged sheets with an offset; soft is a sage paper and
 * ghost has no sheet until hovered. Colours go through --_size, --_bg, --_fg and --_border, and icons through --_icon-size
 * (55% by default), so a parent component can retune them.
 */
const iconButtonVariants = variants({
  base: [
    "kg-icon-button relative inline-grid size-(--_size) shrink-0 cursor-pointer place-items-center p-0 [font:inherit]",
    "border-2 border-(color:--_border) bg-(--_bg) text-(--_fg) [-webkit-tap-highlight-color:transparent]",
    "transition-[background-color,color,border-color,box-shadow,scale,translate] duration-(--kg-duration-fast) ease-kg-out",
    // Small buttons keep a 40px hit area without growing visually.
    "before:absolute before:inset-[min(0px,calc((var(--_size)-2.5rem)/2))]",
    "interactive:hover:bg-(--_bg-hover) interactive:hover:text-(--_fg-hover) interactive:active:scale-90",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
    "[&_svg]:size-[var(--_icon-size,55%)]",
  ],
  variants: {
    variant: {
      solid: [
        "[--_bg:var(--kg-accent)] [--_bg-hover:var(--kg-accent-hover)] [--_fg:var(--kg-accent-fg)] [--_fg-hover:var(--kg-accent-fg)]",
        "[--_border:var(--kg-ink)] shadow-[2px_2px_0_var(--kg-paper-sage)]",
      ],
      soft: "[--_bg:var(--kg-paper-sage)] [--_bg-hover:var(--kg-accent-soft)] [--_fg:var(--kg-fg)] [--_fg-hover:var(--kg-fg)] [--_border:transparent]",
      outline: [
        "[--_bg:var(--kg-surface)] [--_bg-hover:var(--kg-surface-raised)] [--_fg:var(--kg-fg)] [--_fg-hover:var(--kg-fg)]",
        "[--_border:var(--kg-ink)] shadow-kg-xs",
      ],
      ghost: "[--_bg:transparent] [--_bg-hover:var(--kg-muted)] [--_fg:var(--kg-fg-muted)] [--_fg-hover:var(--kg-fg)] [--_border:transparent]",
    },
    size: {
      sm: "[--_size:var(--kg-control-sm)]",
      md: "[--_size:var(--kg-control-md)]",
      lg: "[--_size:var(--kg-control-lg)]",
    },
    round: {
      true: "rounded-full",
      false: "rounded-kg-md",
    },
  },
  defaults: { variant: "ghost", size: "md", round: false },
})

type IconButtonVariantProps = VariantProps<typeof iconButtonVariants>
export type IconButtonVariant = NonNullable<IconButtonVariantProps["variant"]>
export type IconButtonSize = NonNullable<IconButtonVariantProps["size"]>

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "aria-label"
> {
  /** Required: an icon-only button has no other accessible name. */
  label: string
  icon: ReactNode
  variant?: IconButtonVariant
  size?: IconButtonSize
  round?: boolean
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      label,
      icon,
      variant = "ghost",
      size = "md",
      round = false,
      className,
      type,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={label}
      className={iconButtonVariants({ variant, size, round, className })}
      data-variant={variant}
      data-size={size}
      data-round={round || undefined}
      {...props}
    >
      {icon}
    </button>
  ),
)

IconButton.displayName = "IconButton"
