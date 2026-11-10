"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useId } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useLocale } from "../../hooks/use-locale.js"
import { cx } from "../../utils/cx.js"
import { formatMoney } from "../../utils/money.js"
import { Price } from "../price/price.js"

/** `mobile` collapses behind a toggle below 48rem, as on hosted checkouts. */
export type OrderSummaryCollapsible = "mobile" | "always" | "never"

export interface OrderSummaryLine {
  id: string
  title: string
  variantTitle?: string
  image?: string
  quantity: number
  /** Unit price. */
  price: number
  compareAt?: number
}

export interface OrderSummaryDiscount {
  /** e.g. the code, "WELCOME10". Defaults to `labels.discount`. */
  label?: ReactNode
  /** Positive amount taken off. */
  amount: number
}

export interface OrderSummaryLabels {
  heading?: string
  show?: string
  hide?: string
  subtotal?: string
  discount?: string
  shipping?: string
  /** Shown when `shipping` is null. */
  shippingPending?: string
  free?: string
  tax?: string
  total?: string
  quantity?: (quantity: number) => string
}

export interface OrderSummaryProps extends HTMLAttributes<HTMLElement> {
  lines: readonly OrderSummaryLine[]
  /** Defaults to the sum of the lines. */
  subtotal?: number
  discounts?: readonly OrderSummaryDiscount[]
  /** `0` reads "Free"; `null` reads "Calculated at next step"; omit to hide the row. */
  shipping?: number | null
  tax?: number
  /** Defaults to subtotal − discounts + shipping + tax. */
  total?: number
  currency?: string
  locale?: string
  /** Slot under the lines, typically a `CouponInput`. */
  coupon?: ReactNode
  collapsible?: OrderSummaryCollapsible
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  labels?: OrderSummaryLabels
}

const defaultLabels: Required<OrderSummaryLabels> = {
  heading: "Order summary",
  show: "Show order summary",
  hide: "Hide order summary",
  subtotal: "Subtotal",
  discount: "Discount",
  shipping: "Shipping",
  shippingPending: "Calculated at next step",
  free: "Free",
  tax: "Estimated taxes",
  total: "Total",
  quantity: (quantity) => `Quantity ${quantity}`,
}

const Chevron = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
)

const rowClass =
  "kg-order-summary__row flex items-baseline justify-between gap-4 tabular-nums [&_dd]:m-0 [&_dt]:m-0 [&_dt]:text-kg-fg-muted"

/* Collapsed below 48rem ("mobile") or at every width ("always"); "never" always shows. */
const collapsibleClass = {
  always: {
    heading: "sr-only",
    toggle: "flex",
    contentClosed: "grid-rows-[0fr]",
    clipOpen: "pt-5",
    clipClosed: "invisible delay-(--kg-duration-slow)",
  },
  mobile: {
    heading: "max-md:sr-only",
    toggle: "hidden max-md:flex",
    contentClosed: "max-md:grid-rows-[0fr]",
    clipOpen: "max-md:pt-5",
    clipClosed: "max-md:invisible max-md:delay-(--kg-duration-slow)",
  },
  never: { heading: "", toggle: "", contentClosed: "", clipOpen: "", clipClosed: "" },
}

/** Checkout line items and totals, collapsible on small screens. */
export const OrderSummary = forwardRef<HTMLElement, OrderSummaryProps>(
  (
    {
      lines,
      subtotal: subtotalProp,
      discounts = [],
      shipping,
      tax,
      total: totalProp,
      currency = "USD",
      locale,
      coupon,
      collapsible = "mobile",
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const id = useId()
    const resolvedLocale = useLocale(locale)
    const [open, setOpen] = useControllableState({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    })
    const money = (amount: number) =>
      formatMoney(amount, { currency, locale: resolvedLocale })
    const collapse = collapsibleClass[collapsible]
    const closed = !open
    const subtotal =
      subtotalProp ?? lines.reduce((sum, line) => sum + line.price * line.quantity, 0)
    const discountTotal = discounts.reduce((sum, discount) => sum + discount.amount, 0)
    const total =
      totalProp ?? Math.max(0, subtotal - discountTotal + (shipping ?? 0) + (tax ?? 0))
    const contentId = `${id}-content`

    return (
      <section
        ref={ref}
        className={cx("kg-order-summary grid text-kg-base text-kg-fg", className)}
        data-collapsible={collapsible === "never" ? undefined : collapsible}
        data-state={open ? "open" : "closed"}
        aria-labelledby={`${id}-heading`}
        {...props}
      >
        <h2
          id={`${id}-heading`}
          className={cx(
            "kg-order-summary__heading m-0 mb-4 text-kg-lg font-[650] tracking-[-0.015em]",
            collapse.heading,
          )}
        >
          {text.heading}
        </h2>
        {collapsible !== "never" && (
          <button
            type="button"
            className={cx(
              "kg-order-summary__toggle w-full cursor-pointer items-center justify-between gap-4 border-0 border-b-2 border-kg-ink bg-transparent px-0 py-4 font-[inherit] text-kg-fg",
              "focus-visible:rounded-kg-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
              collapse.toggle,
            )}
            aria-expanded={open}
            aria-controls={contentId}
            onClick={() => setOpen(!open)}
          >
            <span
              className={cx(
                "kg-order-summary__toggle-label inline-flex items-center gap-1.5 font-semibold underline-offset-[0.2em] hover:underline",
                "[&>svg]:size-4 [&>svg]:transition-[rotate] [&>svg]:duration-(--kg-duration-base) [&>svg]:ease-kg-out",
                open && "[&>svg]:rotate-180",
              )}
            >
              {open ? text.hide : text.show}
              <Chevron />
            </span>
            <span className="kg-order-summary__toggle-total text-kg-md font-[650] text-kg-fg tabular-nums">
              {money(total)}
            </span>
          </button>
        )}
        <div
          id={contentId}
          className={cx(
            "kg-order-summary__content grid grid-rows-[1fr] transition-[grid-template-rows] duration-(--kg-duration-slow) ease-kg-in-out",
            closed && collapse.contentClosed,
          )}
        >
          <div
            className={cx(
              "kg-order-summary__clip grid min-h-0 gap-5 overflow-hidden transition-[visibility] duration-0",
              closed ? collapse.clipClosed : collapse.clipOpen,
            )}
          >
            <ul className="kg-order-summary__lines m-0 grid list-none gap-4 px-0 pt-2 pb-0">
              {lines.map((line) => (
                <li
                  key={line.id}
                  className="kg-order-summary__line grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4"
                >
                  <span
                    className="kg-order-summary__thumb relative block size-16 rounded-kg-md border-2 border-kg-ink bg-kg-muted data-placeholder:bg-kg-paper-sage [&>img]:size-full [&>img]:rounded-[inherit] [&>img]:object-cover"
                    data-placeholder={line.image ? undefined : ""}
                  >
                    {line.image && (
                      <img src={line.image} alt="" loading="lazy" decoding="async" />
                    )}
                    <span
                      className="kg-order-summary__qty absolute -top-2 -end-2 grid h-[1.375rem] min-w-[1.375rem] place-items-center rounded-full border-2 border-kg-surface bg-kg-accent px-[0.3rem] text-kg-xs font-[650] text-kg-accent-fg"
                      aria-hidden="true"
                    >
                      {new Intl.NumberFormat(resolvedLocale).format(line.quantity)}
                    </span>
                  </span>
                  <span className="kg-order-summary__info grid min-w-0 gap-0.5">
                    <span className="kg-order-summary__title leading-[1.35] font-[550]">
                      {line.title}
                    </span>
                    {line.variantTitle && (
                      <span className="kg-order-summary__variant text-kg-sm text-kg-fg-muted">
                        {line.variantTitle}
                      </span>
                    )}
                    <span className="kg-visually-hidden">
                      {text.quantity(line.quantity)}
                    </span>
                  </span>
                  <Price
                    size="sm"
                    stacked
                    amount={line.price * line.quantity}
                    compareAt={
                      line.compareAt !== undefined
                        ? line.compareAt * line.quantity
                        : undefined
                    }
                    currency={currency}
                    locale={resolvedLocale}
                    savings={false}
                  />
                </li>
              ))}
            </ul>
            {coupon != null && (
              <div className="kg-order-summary__coupon">{coupon}</div>
            )}
            <dl className="kg-order-summary__rows m-0 grid gap-2.5 border-t-2 border-kg-ink pt-5">
              <div className={rowClass}>
                <dt>{text.subtotal}</dt>
                <dd>{money(subtotal)}</dd>
              </div>
              {discounts.map((discount, index) => (
                <div
                  key={index}
                  className={cx(
                    rowClass,
                    "[&_dd]:text-[color-mix(in_oklab,var(--kg-success),var(--kg-fg)_30%)]",
                  )}
                  data-kind="discount"
                >
                  <dt>{discount.label ?? text.discount}</dt>
                  <dd>−{money(discount.amount)}</dd>
                </div>
              ))}
              {shipping !== undefined && (
                <div className={rowClass}>
                  <dt>{text.shipping}</dt>
                  <dd
                    className="data-muted:text-kg-sm data-muted:text-kg-fg-muted"
                    data-muted={shipping === null || undefined}
                  >
                    {shipping === null
                      ? text.shippingPending
                      : shipping === 0
                        ? text.free
                        : money(shipping)}
                  </dd>
                </div>
              )}
              {tax !== undefined && (
                <div className={rowClass}>
                  <dt>{text.tax}</dt>
                  <dd>{money(tax)}</dd>
                </div>
              )}
              <div
                className={cx(
                  rowClass,
                  "border-t-2 border-kg-ink pt-3 [&>dt]:text-kg-md [&>dt]:font-[650] [&>dt]:text-kg-fg",
                  "[&>dd]:inline-flex [&>dd]:items-baseline [&>dd]:gap-2 [&>dd]:text-[length:var(--kg-text-xl)] [&>dd]:font-bold [&>dd]:tracking-[-0.02em]",
                )}
                data-kind="total"
              >
                <dt>{text.total}</dt>
                <dd>
                  <span
                    className="kg-order-summary__currency text-kg-xs font-medium tracking-normal text-kg-fg-muted"
                    aria-hidden="true"
                  >
                    {currency}
                  </span>
                  {money(total)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    )
  },
)

OrderSummary.displayName = "OrderSummary"
