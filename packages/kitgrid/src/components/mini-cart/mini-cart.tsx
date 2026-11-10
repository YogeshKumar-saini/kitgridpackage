"use client"

import { forwardRef, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"
import { formatMoney } from "../../utils/money.js"
import { Button } from "../button/button.js"
import {
  Popover,
  PopoverContent,
  type PopoverContentProps,
  PopoverTrigger,
} from "../popover/popover.js"

export interface MiniCartItem {
  id: string
  name: string
  /** Option summary, e.g. "Sage / M". */
  variant?: string
  image?: string
  /** Unit price. */
  price: number
  quantity: number
}

export interface MiniCartLabels {
  /** Trigger name, given the item count. */
  trigger?: (count: number) => string
  title?: string
  subtotal?: string
  empty?: string
  viewCart?: string
  checkout?: string
  remove?: (name: string) => string
  quantity?: (quantity: number) => string
}

export interface MiniCartProps extends Omit<PopoverContentProps, "children" | "title"> {
  items: readonly MiniCartItem[]
  currency?: string
  locale?: string
  onRemove?: (id: string) => void
  onCheckout?: () => void
  cartHref?: string
  /** Replaces the default footer buttons. */
  actions?: ReactNode
  /** Trigger icon. Defaults to a bag. */
  icon?: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  labels?: MiniCartLabels
}

const defaultLabels: Required<MiniCartLabels> = {
  trigger: (count) => (count === 1 ? "Cart, 1 item" : `Cart, ${count} items`),
  title: "Your cart",
  subtotal: "Subtotal",
  empty: "Your cart is empty.",
  viewCart: "View cart",
  checkout: "Checkout",
  remove: (name) => `Remove ${name}`,
  quantity: (quantity) => `Qty ${quantity}`,
}

const Bag = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 8h14l-1 12.5H6zM9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
)

const Close = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M7 7l10 10M17 7 7 17" strokeLinecap="round" />
  </svg>
)

/** Header cart button with a count, opening a compact popover of lines, subtotal and checkout. */
export const MiniCart = forwardRef<HTMLDivElement, MiniCartProps>(
  (
    {
      items,
      currency = "USD",
      locale,
      onRemove,
      onCheckout,
      cartHref,
      actions,
      icon,
      open,
      defaultOpen,
      onOpenChange,
      labels,
      className,
      align = "end",
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const count = items.reduce((sum, item) => sum + item.quantity, 0)
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const money = { currency, locale }
    return (
      <Popover open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        <PopoverTrigger
          className={cx(
            "kg-mini-cart__trigger relative inline-grid size-(--kg-control-md) cursor-pointer place-items-center rounded-kg-md border-2 border-transparent bg-transparent p-0 text-kg-fg",
            "transition-[background-color,border-color] duration-(--kg-duration-fast) ease-kg-out hover:bg-kg-muted aria-expanded:border-kg-ink aria-expanded:bg-kg-surface",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring [&>svg]:size-[1.3rem]",
          )}
          aria-label={text.trigger(count)}
        >
          {icon ?? <Bag />}
          {count > 0 && (
            <span
              className={cx(
                "kg-mini-cart__count absolute end-0 top-0 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-kg-accent px-1 shadow-[0_0_0_2px_var(--kg-bg)]",
                "text-[0.625rem] font-bold leading-none text-kg-accent-fg tabular-nums",
                "animate-[kg-mini-cart-bump_var(--kg-duration-bounce)_var(--kg-ease-bounce)]",
              )}
              aria-hidden="true"
              key={count}
            >
              {count > 99 ? "99+" : count}
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent
          ref={ref}
          aria-label={text.title}
          align={align}
          className={cx(
            "kg-mini-cart grid overflow-hidden text-kg-fg [--_popover-width:min(22rem,calc(100vw-1rem))] [--_popover-pad:0px] [--_popover-radius:var(--kg-radius-xl)]",
            className,
          )}
          {...props}
        >
          <div className="kg-mini-cart__head flex items-center gap-2 px-4 pt-4 pb-2">
            <span className="kg-mini-cart__title text-kg-base font-semibold">{text.title}</span>
            {count > 0 && <span className="kg-mini-cart__badge rounded-full bg-kg-paper-sage px-2 py-0.5 text-kg-xs font-semibold leading-none text-kg-fg tabular-nums">{count}</span>}
          </div>
          {items.length === 0 ? (
            <p className="kg-mini-cart__empty m-0 px-4 py-6 text-center text-kg-sm text-kg-fg-muted">{text.empty}</p>
          ) : (
            <ul className="kg-mini-cart__items m-0 grid max-h-72 list-none overflow-y-auto px-2 py-0">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={cx(
                    "kg-mini-cart__item grid grid-cols-[3rem_1fr_auto_auto] items-center gap-3 p-2",
                    "border-kg-border not-first:border-t-2",
                    "animate-[kg-pop-in_var(--kg-duration-slow)_var(--kg-ease-out)_backwards]",
                  )}
                >
                  <span
                    className="kg-mini-cart__thumb size-12 overflow-hidden rounded-kg-md border-2 border-kg-ink bg-kg-muted data-placeholder:bg-kg-paper-sage [&>img]:size-full [&>img]:object-cover"
                    data-placeholder={item.image ? undefined : ""}
                  >
                    {item.image && <img src={item.image} alt="" />}
                  </span>
                  <span className="kg-mini-cart__info grid min-w-0">
                    <span className="kg-mini-cart__name truncate text-kg-sm font-semibold">{item.name}</span>
                    <span className="kg-mini-cart__meta text-kg-xs text-kg-fg-muted">
                      {[item.variant, text.quantity(item.quantity)].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="kg-mini-cart__price text-kg-sm font-semibold tabular-nums">
                    {formatMoney(item.price * item.quantity, money)}
                  </span>
                  {onRemove && (
                    <button
                      type="button"
                      className={cx(
                        "kg-mini-cart__remove inline-grid size-7 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-kg-fg-muted",
                        "transition-[color,background-color] duration-(--kg-duration-fast) ease-kg-out hover:bg-kg-muted hover:text-kg-fg",
                        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-kg-ring [&_svg]:size-3.5",
                      )}
                      aria-label={text.remove(item.name)}
                      onClick={() => onRemove(item.id)}
                    >
                      <Close />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {items.length > 0 && (
            <div className="kg-mini-cart__foot grid gap-3 border-t-2 border-kg-ink bg-kg-surface-sunken p-4">
              <div className="kg-mini-cart__subtotal flex justify-between text-kg-sm font-semibold">
                <span>{text.subtotal}</span>
                <span className="kg-tabular">{formatMoney(subtotal, money)}</span>
              </div>
              <div className="kg-mini-cart__actions grid auto-cols-fr grid-flow-col gap-2">
                {actions ?? (
                  <>
                    {cartHref && (
                      <Button variant="outline" asChild>
                        <a href={cartHref}>{text.viewCart}</a>
                      </Button>
                    )}
                    <Button onClick={onCheckout}>{text.checkout}</Button>
                  </>
                )}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    )
  },
)

MiniCart.displayName = "MiniCart"
