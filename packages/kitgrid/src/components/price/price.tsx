"use client"

import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { useLocale } from "../../hooks/use-locale.js"
import { cx } from "../../utils/cx.js"
import { discountPercent, formatMoney, getMoneyFormatter } from "../../utils/money.js"

export type PriceSize = "sm" | "md" | "lg" | "xl"

export interface PriceLabels {
  /** Read before the current amount when on sale. */
  sale?: string
  /** Read before the struck-through amount. */
  regular?: string
}

export interface PriceProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  amount: number
  /** The original price. Shown struck through when higher than `amount`. */
  compareAt?: number
  currency?: string
  locale?: string
  size?: PriceSize
  /** Badge showing the discount. Defaults to a percentage whenever there is one. */
  savings?: "percent" | "amount" | false
  trimZeros?: boolean
  /** Render the minor units small and raised, as on product detail pages. */
  superscript?: boolean
  /** Trailing text such as "/ month". */
  suffix?: ReactNode
  labels?: PriceLabels
  /** Stack the amounts in a column aligned to the end, so prices in a list share a right edge. */
  stacked?: boolean
}

const SIZE: Record<PriceSize, string> = {
  sm: "[--_text:var(--kg-text-sm)]",
  md: "[--_text:var(--kg-text-md)]",
  lg: "[--_text:var(--kg-text-xl)]",
  xl: "[--_text:var(--kg-text-3xl)]",
}

/* Danger pulled toward the text colour, the same AA-safe mix Field uses for errors. */
const saleInk = "text-[color-mix(in_oklab,var(--kg-danger),var(--kg-fg)_30%)]"

const defaultLabels: Required<PriceLabels> = {
  sale: "Sale price",
  regular: "Regular price",
}

export const Price = forwardRef<HTMLSpanElement, PriceProps>(
  (
    {
      amount,
      compareAt,
      currency = "USD",
      locale: localeProp,
      size = "md",
      savings = "percent",
      trimZeros = false,
      superscript = false,
      suffix,
      labels,
      stacked = false,
      className,
      ...props
    },
    ref,
  ) => {
    const locale = useLocale(localeProp)
    const options = { currency, locale, trimZeros }
    const text = { ...defaultLabels, ...labels }
    const percent = discountPercent(amount, compareAt)
    const onSale = percent > 0 && compareAt !== undefined
    const formatted = formatMoney(amount, options)

    const visual = superscript
      ? getMoneyFormatter(options)
          .formatToParts(amount)
          .map((part, index) => {
            if (part.type === "decimal") return null
            if (part.type === "fraction") {
              return (
                <sup
                  key={index}
                  className="kg-price__minor ms-[0.05em] align-[0.55em] text-[0.55em] leading-none"
                >
                  {part.value}
                </sup>
              )
            }
            return <span key={index}>{part.value}</span>
          })
      : formatted

    return (
      <span
        ref={ref}
        className={cx(
          "kg-price inline-flex gap-x-[0.5em] gap-y-[0.25em] leading-[1.1] tabular-nums",
          stacked ? "flex-col items-end text-end" : "flex-wrap items-baseline",
          SIZE[size] ?? SIZE.md,
          className,
        )}
        data-size={size}
        data-on-sale={onSale || undefined}
        {...props}
      >
        <span
          className={cx(
            "kg-price__current text-(length:--_text) font-bold tracking-[-0.015em]",
            onSale ? saleInk : "text-kg-fg",
          )}
        >
          <span className="kg-visually-hidden">
            {onSale ? `${text.sale} ${formatted}` : formatted}
          </span>
          <span aria-hidden="true">{visual}</span>
        </span>
        {suffix != null && <span className="kg-price__suffix text-[length:calc(var(--_text)*0.7)] text-kg-fg-muted">{suffix}</span>}
        {onSale && (
          <s className="kg-price__compare text-[length:calc(var(--_text)*0.72)] text-kg-fg-muted decoration-1">
            <span className="kg-visually-hidden">{text.regular} </span>
            {formatMoney(compareAt, options)}
          </s>
        )}
        {onSale && savings && (
          <span className="kg-price__savings self-center rounded-full bg-kg-paper-rose px-[0.5em] py-[0.2em] text-[length:max(0.6875rem,calc(var(--_text)*0.55))] font-bold leading-[1.2] text-kg-fg">
            {savings === "percent"
              ? `−${percent}%`
              : `−${formatMoney(compareAt - amount, options)}`}
          </span>
        )}
      </span>
    )
  },
)

Price.displayName = "Price"
