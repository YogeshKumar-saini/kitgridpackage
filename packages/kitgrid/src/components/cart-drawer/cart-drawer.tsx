"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
  version,
} from "react"
import { useEventCallback } from "../../hooks/use-event-callback.js"
import { useLocale } from "../../hooks/use-locale.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useMediaQuery } from "../../hooks/use-media-query.js"
import { usePresence } from "../../hooks/use-presence.js"
import { cx } from "../../utils/cx.js"
import { Button } from "../button/button.js"
import { type CartLine, getCartTotals, useOptionalCart } from "../cart/cart.js"
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  type DrawerContentProps,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../drawer/drawer.js"
import { FreeShippingProgress } from "../free-shipping-progress/free-shipping-progress.js"
import { NumberTicker } from "../number-ticker/number-ticker.js"
import { toast } from "../toast/toast-store.js"
import { CartLineItem, type CartLineItemLabels } from "./cart-line-item.js"

export interface CartDrawerLabels {
  title?: string
  /** Shown next to the title. */
  count?: (count: number, formatted: string) => string
  emptyTitle?: ReactNode
  emptyDescription?: ReactNode
  subtotal?: string
  savings?: string
  note?: ReactNode
  checkout?: ReactNode
  continueShopping?: ReactNode
  close?: string
  /** Toast title after a line is removed. */
  removed?: (title: string) => ReactNode
  undo?: string
  line?: CartLineItemLabels
}

export interface CartDrawerProps extends Omit<
  DrawerContentProps,
  "children" | "title"
> {
  /** Controlled open state. Defaults to the surrounding `CartProvider`. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Lines to show. Defaults to the surrounding `CartProvider`. */
  lines?: CartLine[]
  currency?: string
  locale?: string
  freeShippingThreshold?: number
  onQuantityChange?: (id: string, quantity: number) => void
  onRemove?: (line: CartLine, index: number) => void
  /** Called by the undo toast. Defaults to `restoreItem` of the surrounding `CartProvider`. */
  onRestore?: (line: CartLine, index: number) => void
  onCheckout?: (lines: CartLine[]) => void
  /** Render the checkout button as a link. */
  checkoutHref?: string
  onContinueShopping?: () => void
  /** Slot above the totals, typically a `CouponInput`. */
  coupon?: ReactNode
  /** Replaces the whole empty state. */
  empty?: ReactNode
  /** Offer "Undo" in a toast after a removal. Needs a mounted `<Toaster>`. */
  undoable?: boolean
  /** Become a bottom sheet below 40rem. */
  mobileSheet?: boolean
  labels?: CartDrawerLabels
}

const defaultLabels = {
  title: "Your cart",
  count: (count: number, formatted: string) =>
    count === 1 ? "1 item" : `${formatted} items`,
  emptyTitle: "Your cart is empty",
  emptyDescription: "Find something you love. Returns are free on every order.",
  subtotal: "Subtotal",
  savings: "You save",
  note: "Shipping and taxes calculated at checkout.",
  checkout: "Checkout",
  continueShopping: "Continue shopping",
  close: "Close cart",
  removed: (title: string): ReactNode => `Removed ${title}`,
  undo: "Undo",
} satisfies Omit<Required<CartDrawerLabels>, "line">

interface Row {
  line: CartLine
  exiting: boolean
  entering: boolean
}

/** Keeps removed lines in place while they collapse, and flags lines added after mount. */
const mergeRows = (previous: readonly Row[], lines: readonly CartLine[]): Row[] => {
  const before = new Set(previous.map((row) => row.line.id))
  const ids = new Set(lines.map((line) => line.id))
  const rows: Row[] = lines.map((line) => ({
    line,
    exiting: false,
    entering:
      !before.has(line.id) ||
      (previous.find((row) => row.line.id === line.id)?.exiting ?? false),
  }))
  previous.forEach((row, index) => {
    if (ids.has(row.line.id)) return
    let at = 0
    for (let i = index - 1; i >= 0; i--) {
      const neighbour = previous[i]
      const position = neighbour
        ? rows.findIndex((r) => r.line.id === neighbour.line.id)
        : -1
      if (position !== -1) {
        at = position + 1
        break
      }
    }
    rows.splice(at, 0, { line: row.line, exiting: true, entering: false })
  })
  return rows
}

// React 18 only renders `inert` as a string attribute; React 19 expects a boolean.
const inertProps = (
  Number.parseInt(version, 10) >= 19 ? { inert: true } : { inert: "" }
) as HTMLAttributes<HTMLElement>

const FOCUSABLE = "input, button:not([disabled]), a[href]"

const CartRow = ({
  row,
  onExited,
  children,
}: {
  row: Row
  onExited: (id: string) => void
  children: ReactNode
}) => {
  const presence = usePresence<HTMLLIElement>(!row.exiting)
  const { ref } = presence
  useEffect(() => {
    if (!presence.present) onExited(row.line.id)
  }, [presence.present, onExited, row.line.id])

  // The removed row held focus (its remove button), so hand it to a neighbour before inert blurs it.
  useIsomorphicLayoutEffect(() => {
    const node = ref.current
    if (!row.exiting || !node?.contains(document.activeElement)) return
    const live = (element: Element | null): element is HTMLElement =>
      element instanceof HTMLElement && element.dataset.state === "open"
    let next: Element | null = node.nextElementSibling
    while (next && !live(next)) next = next.nextElementSibling
    let previous: Element | null = node.previousElementSibling
    while (previous && !live(previous)) previous = previous.previousElementSibling
    const target =
      (next ?? previous)?.querySelector<HTMLElement>(FOCUSABLE) ??
      node.closest<HTMLElement>("dialog")
    target?.focus()
  }, [row.exiting, ref])
  return (
    <li
      ref={presence.ref}
      className={cx(
        "kg-cart-drawer__row grid grid-rows-[1fr]",
        "data-[state=open]:data-entering:animate-[kg-cart-row-in_var(--kg-duration-slow)_var(--kg-ease-out)]",
        "data-[state=closed]:pointer-events-none data-[state=closed]:animate-[kg-cart-row-out_var(--kg-duration-slow)_var(--kg-ease-in-out)_forwards]",
      )}
      data-state={presence.state}
      data-entering={row.entering || undefined}
      {...(row.exiting ? inertProps : null)}
    >
      <div className="kg-cart-drawer__row-clip min-h-0 overflow-hidden">{children}</div>
    </li>
  )
}

const totalClass =
  "kg-cart-drawer__total flex items-baseline justify-between gap-4 tabular-nums [&_dd]:m-0 [&_dt]:m-0"

const BagIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Z" />
    <path d="M9 10V7a3 3 0 0 1 6 0v3" />
  </svg>
)

/**
 * The slide-out cart. Inside a `CartProvider` it needs no props; every piece of state can also be
 * passed explicitly to drive it from your own store.
 */
export const CartDrawer = forwardRef<HTMLDialogElement, CartDrawerProps>(
  (
    {
      open: openProp,
      onOpenChange,
      lines: linesProp,
      currency: currencyProp,
      locale: localeProp,
      freeShippingThreshold: thresholdProp,
      onQuantityChange,
      onRemove,
      onRestore,
      onCheckout,
      checkoutHref,
      onContinueShopping,
      coupon,
      empty,
      undoable = true,
      mobileSheet = false,
      side = "right",
      size = "md",
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const cart = useOptionalCart()
    const lines = linesProp ?? cart?.lines ?? []
    const currency = currencyProp ?? cart?.currency ?? "USD"
    const locale = useLocale(localeProp ?? cart?.locale)
    const threshold = thresholdProp ?? cart?.freeShippingThreshold
    const open = openProp ?? cart?.isOpen ?? false
    const { count, subtotal, savings } = getCartTotals(lines)
    const small = useMediaQuery("(max-width: 40rem)")
    const resolvedSide = mobileSheet && small ? "bottom" : side

    const [rows, setRows] = useState<Row[]>(() =>
      lines.map((line) => ({ line, exiting: false, entering: false })),
    )
    const [seen, setSeen] = useState(lines)
    if (seen !== lines) {
      setSeen(lines)
      setRows((current) => mergeRows(current, lines))
    }
    const handleExited = useCallback((id: string) => {
      setRows((current) =>
        current.filter((row) => !(row.exiting && row.line.id === id)),
      )
    }, [])

    const setOpen = (next: boolean) => {
      onOpenChange?.(next)
      if (openProp === undefined) cart?.setOpen(next)
    }

    const restore = useEventCallback((line: CartLine, index: number) => {
      if (onRestore) onRestore(line, index)
      else cart?.restoreItem(line, index)
    })

    const remove = (line: CartLine) => {
      const index = lines.findIndex((entry) => entry.id === line.id)
      if (onRemove) onRemove(line, index)
      else cart?.removeItem(line.id)
      if (!undoable) return
      toast({
        title: text.removed(line.title),
        action: { label: text.undo, onClick: () => restore(line, index) },
      })
    }

    const changeQuantity = (line: CartLine, quantity: number) => {
      if (onQuantityChange) onQuantityChange(line.id, quantity)
      else cart?.updateQuantity(line.id, quantity)
    }

    const continueShopping = () => {
      onContinueShopping?.()
      setOpen(false)
    }

    const money = { style: "currency", currency } as const
    const isEmpty = rows.length === 0

    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent
          ref={ref}
          side={resolvedSide}
          size={resolvedSide === "bottom" ? "lg" : size}
          closeLabel={text.close}
          className={cx("kg-cart-drawer", className)}
          data-empty={isEmpty || undefined}
          {...props}
        >
          <DrawerHeader className="kg-cart-drawer__header">
            <DrawerTitle>
              {text.title}
              {count > 0 && (
                <span className="kg-cart-drawer__count ms-[0.5em] text-kg-sm font-medium text-kg-fg-muted">
                  {text.count(count, new Intl.NumberFormat(locale).format(count))}
                </span>
              )}
            </DrawerTitle>
            {threshold !== undefined && !isEmpty && (
              <FreeShippingProgress
                subtotal={subtotal}
                threshold={threshold}
                currency={currency}
                locale={locale}
                size="sm"
                className="mt-3"
              />
            )}
          </DrawerHeader>

          <DrawerBody className="kg-cart-drawer__body">
            {isEmpty ? (
              (empty ?? (
                <div className="kg-cart-drawer__empty grid justify-items-center gap-2 px-4 py-14 text-center">
                  <span className="kg-cart-drawer__empty-icon relative mb-4 grid size-16 place-items-center rounded-full border-2 border-kg-ink bg-kg-paper-sage text-kg-fg shadow-kg-sm [&>svg]:size-7">
                    <BagIcon />
                  </span>
                  <p className="kg-cart-drawer__empty-title m-0 text-kg-lg font-semibold tracking-[-0.015em]">
                    {text.emptyTitle}
                  </p>
                  <p className="kg-cart-drawer__empty-description m-0 max-w-72 text-kg-base text-kg-fg-muted">
                    {text.emptyDescription}
                  </p>
                  <Button className="mt-4" onClick={continueShopping}>
                    {text.continueShopping}
                  </Button>
                </div>
              ))
            ) : (
              <ul className="kg-cart-drawer__lines m-0 grid list-none p-0">
                {rows.map((row) => (
                  <CartRow key={row.line.id} row={row} onExited={handleExited}>
                    <CartLineItem
                      className="[li+li_&]:border-t [li+li_&]:border-kg-border"
                      line={row.line}
                      currency={currency}
                      locale={locale}
                      labels={labels?.line}
                      onQuantityChange={(quantity) =>
                        changeQuantity(row.line, quantity)
                      }
                      onRemove={() => remove(row.line)}
                    />
                  </CartRow>
                ))}
              </ul>
            )}
          </DrawerBody>

          {!isEmpty && (
            <DrawerFooter className="kg-cart-drawer__footer">
              {coupon != null && (
                <div className="kg-cart-drawer__coupon">{coupon}</div>
              )}
              <dl className="kg-cart-drawer__totals m-0 grid gap-1.5">
                {savings > 0 && (
                  <div
                    className={cx(
                      totalClass,
                      "text-kg-sm text-[color-mix(in_oklab,var(--kg-success),var(--kg-fg)_30%)]",
                    )}
                    data-kind="savings"
                  >
                    <dt>{text.savings}</dt>
                    <dd>
                      <NumberTicker
                        value={savings}
                        format={money}
                        locale={locale}
                        trigger="mount"
                        from={savings}
                      />
                    </dd>
                  </div>
                )}
                <div className={cx(totalClass, "text-kg-md font-[650]")} data-kind="subtotal">
                  <dt>{text.subtotal}</dt>
                  <dd>
                    <NumberTicker
                      value={subtotal}
                      format={money}
                      locale={locale}
                      trigger="mount"
                      from={subtotal}
                    />
                  </dd>
                </div>
              </dl>
              <p className="kg-cart-drawer__note m-0 text-kg-xs text-kg-fg-muted">{text.note}</p>
              {checkoutHref ? (
                <Button asChild size="lg" fullWidth>
                  <a href={checkoutHref} onClick={() => onCheckout?.(lines)}>
                    {text.checkout}
                  </a>
                </Button>
              ) : (
                <Button size="lg" fullWidth onClick={() => onCheckout?.(lines)}>
                  {text.checkout}
                </Button>
              )}
              <Button variant="ghost" fullWidth onClick={continueShopping}>
                {text.continueShopping}
              </Button>
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    )
  },
)

CartDrawer.displayName = "CartDrawer"
