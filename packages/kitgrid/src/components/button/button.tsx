import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react"
import { Slot } from "../../primitives/slot.js"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * Paper Layers: a raised button is a sheet lifted off the page by an offset, ink by default or
 * --_lift when the fill is ink itself. Hover lifts it further; pressing pushes it flat.
 */
const raised = [
  "border-kg-ink shadow-[3px_3px_0_var(--_lift,var(--kg-ink))]",
  "interactive:hover:-translate-px interactive:hover:shadow-[5px_5px_0_var(--_lift,var(--kg-ink))]",
  "interactive:active:translate-x-[3px] interactive:active:translate-y-[3px] interactive:active:shadow-none",
]

export const buttonVariants = variants({
  base: [
    "kg-button relative inline-flex items-center justify-center gap-2 rounded-full border-2",
    "font-semibold leading-none whitespace-nowrap no-underline select-none cursor-pointer",
    "transition-[translate,box-shadow,background-color,color] duration-(--kg-duration-fast) ease-kg-out",
    "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-kg-ring",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
    "aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:shadow-none",
    "data-loading:cursor-progress data-loading:opacity-100",
    "[&_svg]:size-[1.15em] [&_svg]:shrink-0",
  ],
  variants: {
    variant: {
      solid: [raised, "bg-kg-accent text-kg-accent-fg [--_lift:var(--kg-paper-sage)]"],
      outline: [raised, "bg-kg-surface text-kg-fg"],
      danger: [raised, "bg-kg-danger text-kg-danger-fg"],
      soft: "border-transparent bg-kg-paper-sage text-kg-fg interactive:hover:bg-kg-accent-soft",
      ghost: "border-transparent bg-transparent text-kg-fg interactive:hover:bg-kg-muted",
      link: "h-auto rounded-none border-0 bg-transparent px-0 text-kg-accent-strong underline-offset-[0.25em] interactive:hover:underline",
    },
    size: {
      sm: "h-kg-sm px-3 text-kg-sm",
      md: "h-kg-md px-4 text-kg-base",
      lg: "h-kg-lg px-5 text-kg-md",
    },
    fullWidth: {
      true: "w-full",
      false: "",
    },
  },
  defaults: { variant: "solid", size: "md", fullWidth: false },
  compound: [{ variant: "link", class: "h-auto px-0" }],
})

type ButtonVariantProps = VariantProps<typeof buttonVariants>
export type ButtonVariant = NonNullable<ButtonVariantProps["variant"]>
export type ButtonSize = NonNullable<ButtonVariantProps["size"]>

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Shows a spinner and blocks clicks while keeping the button's width. */
  loading?: boolean
  leading?: ReactNode
  trailing?: ReactNode
  fullWidth?: boolean
  /** Render the child element (e.g. a router link) with button styling instead of a <button>. */
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "solid",
      size = "md",
      loading = false,
      leading,
      trailing,
      fullWidth = false,
      asChild = false,
      className,
      disabled,
      type,
      children,
      ...props
    },
    ref,
  ) => {
    const shared = {
      className: buttonVariants({ variant, size, fullWidth, className }),
      "data-variant": variant,
      "data-size": size,
      "data-loading": loading || undefined,
      "data-full-width": fullWidth || undefined,
      "aria-busy": loading || undefined,
    }

    if (asChild) {
      return (
        <Slot
          ref={ref}
          {...shared}
          aria-disabled={disabled || loading || undefined}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    return (
      <button
        ref={ref}
        type={type ?? "button"}
        disabled={disabled || loading}
        {...shared}
        {...props}
      >
        {loading && (
          <span
            className="kg-button__spinner absolute inset-0 m-auto size-[1.15em] animate-spin rounded-full border-2 border-current border-e-transparent [animation-duration:0.7s] motion-reduce:[animation-duration:1.6s]"
            aria-hidden="true"
          />
        )}
        <span
          className={`kg-button__content inline-flex items-center gap-2 ${loading ? "invisible" : ""}`}
        >
          {leading}
          {children}
          {trailing}
        </span>
      </button>
    )
  },
)

Button.displayName = "Button"
