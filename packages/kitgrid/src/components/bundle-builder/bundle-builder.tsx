"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useId } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { formatMoney } from "../../utils/money.js"
import { Button } from "../button/button.js"
import { Price } from "../price/price.js"

export interface BundleBuilderItem {
  id: string
  name: string
  image?: string
  price: number
  /** The product being viewed: always included, cannot be unticked. */
  anchor?: boolean
}

export interface BundleBuilderLabels {
  title?: string
  thisItem?: string
  total?: string
  /** Button text for the selected count. */
  add?: (count: number) => string
  /** Savings line, given the formatted amount. */
  savings?: (amount: string) => string
}

export interface BundleBuilderProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  items: readonly BundleBuilderItem[]
  /** Percent off the bundle when two or more items are selected. */
  discount?: number
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (ids: string[]) => void
  onAdd?: (ids: string[]) => void | Promise<void>
  currency?: string
  locale?: string
  /** Shown while adding. */
  loading?: boolean
  labels?: BundleBuilderLabels
  icon?: ReactNode
}

const defaultLabels: Required<BundleBuilderLabels> = {
  title: "Frequently bought together",
  thisItem: "This item",
  total: "Total",
  add: (count) => (count === 1 ? "Add to cart" : `Add ${count} to cart`),
  savings: (amount) => `You save ${amount}`,
}

/** "Frequently bought together": product thumbnails joined by plus signs, tick boxes and a live total. */
export const BundleBuilder = forwardRef<HTMLElement, BundleBuilderProps>(
  (
    {
      items,
      discount = 0,
      value: valueProp,
      defaultValue,
      onValueChange,
      onAdd,
      currency = "USD",
      locale,
      loading = false,
      labels,
      icon,
      className,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const id = useId()
    const [value, setValue] = useControllableState<string[]>({
      value: valueProp,
      defaultValue: defaultValue ?? items.map((item) => item.id),
      onChange: onValueChange,
    })
    const selected = items.filter((item) => item.anchor || value.includes(item.id))
    const full = selected.reduce((sum, item) => sum + item.price, 0)
    const applies = discount > 0 && selected.length > 1
    const total = applies ? Math.round(full * (100 - discount)) / 100 : full
    const money = { currency, locale }

    const toggle = (itemId: string, checked: boolean) =>
      setValue((current) =>
        checked ? [...new Set([...current, itemId])] : current.filter((v) => v !== itemId),
      )

    return (
      <section
        ref={ref}
        aria-labelledby={`${id}-title`}
        className={cx(
          "kg-bundle-builder grid gap-4 rounded-kg-xl border-2 border-kg-ink bg-kg-surface p-5 text-kg-fg shadow-kg-md",
          className,
        )}
        {...props}
      >
        <h2 id={`${id}-title`} className="kg-bundle-builder__title m-0 text-kg-md font-semibold tracking-[-0.012em] text-kg-fg">
          {text.title}
        </h2>
        <div className="kg-bundle-builder__images flex flex-wrap items-center gap-2" aria-hidden="true">
          {items.map((item, index) => (
            <span key={item.id} className="kg-bundle-builder__image-wrap inline-flex items-center gap-2">
              {index > 0 && <span className="kg-bundle-builder__plus text-kg-lg font-semibold text-kg-fg-muted">+</span>}
              <span
                className={cx(
                  "kg-bundle-builder__image block size-20 overflow-hidden rounded-kg-lg border-2 border-kg-border bg-kg-muted",
                  "scale-94 opacity-40 grayscale-80 data-placeholder:bg-kg-paper-sage [&>img]:size-full [&>img]:object-cover",
                  "transition-[opacity,filter,scale,box-shadow,border-color] duration-[var(--kg-duration-slow)] ease-kg-out",
                  "data-selected:scale-100 data-selected:border-kg-ink data-selected:opacity-100 data-selected:shadow-kg-sm data-selected:grayscale-0",
                )}
                data-placeholder={item.image ? undefined : ""}
                data-selected={item.anchor || value.includes(item.id) || undefined}
              >
                {item.image && <img src={item.image} alt="" />}
              </span>
            </span>
          ))}
        </div>
        <ul className="kg-bundle-builder__list m-0 grid list-none gap-2 p-0">
          {items.map((item) => {
            const checked = item.anchor || value.includes(item.id)
            return (
              <li key={item.id} className="kg-bundle-builder__item flex items-center justify-between gap-3 text-kg-sm">
                <label className="kg-bundle-builder__label flex min-w-0 cursor-pointer items-center gap-2.5 has-disabled:cursor-default">
                  <input
                    type="checkbox"
                    className="kg-bundle-builder__checkbox m-0 size-[1.05rem] shrink-0 accent-kg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring"
                    checked={checked}
                    disabled={item.anchor}
                    onChange={(event) => toggle(item.id, event.target.checked)}
                  />
                  <span className="kg-bundle-builder__name min-w-0">
                    {item.anchor && (
                      <span className="kg-bundle-builder__tag font-semibold">{text.thisItem}: </span>
                    )}
                    {item.name}
                  </span>
                </label>
                <span className="kg-bundle-builder__price kg-tabular font-medium text-kg-fg-muted">
                  {formatMoney(item.price, money)}
                </span>
              </li>
            )
          })}
        </ul>
        <div className="kg-bundle-builder__foot flex flex-wrap items-end justify-between gap-3 border-t-2 border-kg-border pt-4">
          <div className="kg-bundle-builder__total grid gap-0.5" aria-live="polite">
            <span className="kg-bundle-builder__total-label text-kg-xs text-kg-fg-muted">{text.total}</span>
            <Price
              amount={total}
              compareAt={applies ? full : undefined}
              currency={currency}
              locale={locale}
              savings={false}
              size="lg"
            />
            {applies && (
              <span className="kg-bundle-builder__savings text-kg-xs font-semibold text-kg-success">
                {text.savings(formatMoney(full - total, money))}
              </span>
            )}
          </div>
          <Button
            leading={icon}
            loading={loading}
            disabled={selected.length === 0}
            onClick={() => void onAdd?.(selected.map((item) => item.id))}
          >
            {text.add(selected.length)}
          </Button>
        </div>
      </section>
    )
  },
)

BundleBuilder.displayName = "BundleBuilder"
