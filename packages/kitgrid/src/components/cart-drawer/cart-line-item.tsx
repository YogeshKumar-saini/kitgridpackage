"use client"

import { forwardRef, type HTMLAttributes } from "react"
import { cx } from "../../utils/cx.js"
import type { CartLine } from "../cart/cart.js"
import { Price } from "../price/price.js"
import { QuantityStepper } from "../quantity-stepper/quantity-stepper.js"

export interface CartLineItemLabels {
  remove?: string
  /** Read before the line total. */
  total?: string
}

export interface CartLineItemProps extends HTMLAttributes<HTMLDivElement> {
  line: CartLine
  currency?: string
  locale?: string
  onQuantityChange?: (quantity: number) => void
  onRemove?: () => void
  /** Hide the stepper and show "Qty 2" instead, e.g. in a read-only review step. */
  readOnly?: boolean
  labels?: CartLineItemLabels
}

const defaultLabels: Required<CartLineItemLabels> = {
  remove: "Remove",
  total: "Line total",
}

const mediaClass =
  "kg-cart-line__media block aspect-[4/5] overflow-hidden rounded-kg-md border-2 border-kg-ink bg-kg-muted data-placeholder:bg-kg-paper-sage [&>img]:block [&>img]:size-full [&>img]:object-cover"

/** One cart row: thumbnail, title, variant, line total and a quantity stepper. */
export const CartLineItem = forwardRef<HTMLDivElement, CartLineItemProps>(
  (
    {
      line,
      currency,
      locale,
      onQuantityChange,
      onRemove,
      readOnly = false,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const compareAt =
      line.compareAt !== undefined && line.compareAt > line.price
        ? line.compareAt * line.quantity
        : undefined
    const image = line.image ? (
      <img src={line.image} alt="" loading="lazy" decoding="async" />
    ) : null

    return (
      <div
        ref={ref}
        className={cx(
          "kg-cart-line grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3 py-4",
          className,
        )}
        {...props}
      >
        {line.href ? (
          // The title link already names the product, so the image link is skipped by AT.
          <a
            className={mediaClass}
            data-placeholder={image ? undefined : ""}
            href={line.href}
            tabIndex={-1}
            aria-hidden="true"
          >
            {image}
          </a>
        ) : (
          <span className={mediaClass} data-placeholder={image ? undefined : ""}>
            {image}
          </span>
        )}
        <div className="kg-cart-line__info grid min-w-0 gap-1">
          <p className="kg-cart-line__title m-0 text-kg-base leading-[1.35] font-semibold">
            {line.href ? (
              <a
                className="rounded-kg-xs text-inherit no-underline hover:underline hover:underline-offset-[0.2em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring"
                href={line.href}
              >
                {line.title}
              </a>
            ) : (
              line.title
            )}
          </p>
          {line.variantTitle && (
            <p className="kg-cart-line__variant m-0 text-kg-sm text-kg-fg-muted">{line.variantTitle}</p>
          )}
          <div className="kg-cart-line__controls mt-2 flex flex-wrap items-center gap-3">
            {readOnly ? (
              <span className="kg-cart-line__qty text-kg-sm text-kg-fg-muted">× {line.quantity}</span>
            ) : (
              <QuantityStepper
                size="sm"
                label={line.title}
                value={line.quantity}
                max={line.maxQuantity}
                onValueChange={onQuantityChange}
                onRemove={onRemove}
              />
            )}
            {!readOnly && onRemove && (
              <button
                type="button"
                className="kg-cart-line__remove cursor-pointer rounded-kg-xs border-0 bg-transparent p-0 font-[inherit] text-kg-xs text-kg-fg-muted underline underline-offset-[0.2em] hover:text-kg-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring"
                aria-label={`${text.remove} ${line.title}`}
                onClick={onRemove}
              >
                {text.remove}
              </button>
            )}
          </div>
        </div>
        <Price
          className="kg-cart-line__price"
          stacked
          amount={line.price * line.quantity}
          compareAt={compareAt}
          currency={currency}
          locale={locale}
          savings={false}
          size="sm"
        />
      </div>
    )
  },
)

CartLineItem.displayName = "CartLineItem"
