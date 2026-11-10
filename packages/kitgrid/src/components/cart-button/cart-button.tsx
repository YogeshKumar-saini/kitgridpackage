"use client"

import {
  type ButtonHTMLAttributes,
  forwardRef,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
} from "react"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useLocale } from "../../hooks/use-locale.js"
import { variants } from "../../utils/variants.js"
import { useOptionalCart } from "../cart/cart.js"

export type CartButtonSize = "sm" | "md" | "lg"
export type CartButtonVariant = "ghost" | "outline" | "soft"

export interface CartButtonLabels {
  /** The accessible name, e.g. "Cart, 3 items". */
  label?: (count: number, formatted: string) => string
}

export interface CartButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "aria-label"
> {
  /** Units in the cart. Read from the surrounding `CartProvider` when omitted. */
  count?: number
  /** Counts above this show as "99+". */
  max?: number
  /** Replaces the bag icon. */
  icon?: ReactNode
  size?: CartButtonSize
  variant?: CartButtonVariant
  locale?: string
  labels?: CartButtonLabels
}

const defaultLabel = (count: number, formatted: string) =>
  count === 1 ? "Cart, 1 item" : `Cart, ${formatted} items`

const BagIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Z" />
    <path d="M9 10V7a3 3 0 0 1 6 0v3" />
  </svg>
)

const cartButtonVariants = variants({
  base: [
    "kg-cart-button relative inline-grid size-(--_size) shrink-0 cursor-pointer place-items-center rounded-full border-2 p-0 font-[inherit] text-kg-fg",
    "transition-[background-color,translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out [-webkit-tap-highlight-color:transparent]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
  ],
  variants: {
    variant: {
      ghost: "border-transparent bg-transparent hover:bg-kg-muted active:translate-y-px",
      outline: [
        "border-kg-ink bg-kg-surface shadow-kg-xs hover:-translate-px hover:shadow-kg-sm",
        "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
      ],
      soft: "border-transparent bg-kg-paper-sage hover:border-kg-ink active:translate-y-px",
    },
    size: {
      sm: "[--_size:var(--kg-control-sm)]",
      md: "[--_size:var(--kg-control-md)]",
      lg: "[--_size:var(--kg-control-lg)]",
    },
  },
  defaults: { variant: "ghost", size: "md" },
})

/**
 * The header cart icon. It is the `[data-cart-target]` that fly-to-cart animations land on, its
 * badge pops when the count goes up, and inside a `CartProvider` it opens the cart.
 */
export const CartButton = forwardRef<HTMLButtonElement, CartButtonProps>(
  (
    {
      count: countProp,
      max = 99,
      icon,
      size = "md",
      variant = "ghost",
      locale,
      labels,
      className,
      onClick,
      type,
      ...props
    },
    ref,
  ) => {
    const cart = useOptionalCart()
    const count = countProp ?? cart?.count ?? 0
    const reduced = useReducedMotion()
    const badge = useRef<HTMLSpanElement>(null)
    const previous = useRef(count)
    const resolvedLocale = useLocale(locale)
    const formatted = new Intl.NumberFormat(resolvedLocale).format(count)
    const shown =
      count > max ? `${new Intl.NumberFormat(resolvedLocale).format(max)}+` : formatted

    useEffect(() => {
      const before = previous.current
      previous.current = count
      const node = badge.current
      if (count <= before || reduced || !node?.animate) return
      node.animate(
        [
          { scale: 0.4 },
          { scale: 1.35, offset: 0.45 },
          { scale: 0.9, offset: 0.7 },
          { scale: 1 },
        ],
        { duration: 520, easing: "cubic-bezier(0.2, 0.9, 0.3, 1.2)" },
      )
    }, [count, reduced])

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (!event.defaultPrevented && cart) cart.open()
    }

    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={cartButtonVariants({ variant, size, className })}
        data-size={size}
        data-variant={variant}
        data-cart-target=""
        aria-label={(labels?.label ?? defaultLabel)(count, formatted)}
        aria-haspopup={cart ? "dialog" : undefined}
        aria-expanded={cart ? cart.isOpen : undefined}
        onClick={handleClick}
        {...props}
      >
        <span className="kg-cart-button__icon grid size-[55%] [&>svg]:size-full" aria-hidden="true">
          {icon ?? <BagIcon />}
        </span>
        <span
          ref={badge}
          className="kg-cart-button__badge absolute -top-0.5 -end-0.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-kg-bg bg-kg-accent px-[0.3rem] text-[0.6875rem] leading-none font-bold text-kg-accent-fg tabular-nums transition-[scale,opacity] duration-(--kg-duration-base) ease-kg-out data-empty:scale-0 data-empty:opacity-0"
          data-empty={count === 0 || undefined}
          aria-hidden="true"
        >
          {shown}
        </span>
      </button>
    )
  },
)

CartButton.displayName = "CartButton"
