"use client"

import { forwardRef, useMemo } from "react"
import { useLocale } from "../../hooks/use-locale.js"
import { cx } from "../../utils/cx.js"
import { NumberField, type NumberFieldProps } from "../number-field/number-field.js"

export interface CurrencyInputProps
  extends Omit<NumberFieldProps, "formatOptions" | "leading" | "trailing" | "stepper"> {
  /** ISO 4217 code. */
  currency?: string
  /** Shows the currency code after the amount. */
  showCode?: boolean
  /** Hides the cents for currencies or prices that never use them. */
  wholeUnits?: boolean
}

const currencyParts = (locale: string, currency: string) => {
  const format = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  })
  const symbol =
    format.formatToParts(1).find((part) => part.type === "currency")?.value ?? currency
  return { symbol, digits: format.resolvedOptions().maximumFractionDigits ?? 2 }
}

/**
 * An amount field: the symbol sits outside the editable text, digits follow the currency's
 * minor units, and the amount is grouped in the user's locale once they leave the field.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      currency = "USD",
      showCode = false,
      wholeUnits = false,
      locale: localeProp,
      min = 0,
      className,
      ...props
    },
    ref,
  ) => {
    const locale = useLocale(localeProp)
    const { symbol, digits } = useMemo(() => currencyParts(locale, currency), [locale, currency])
    const fraction = wholeUnits ? 0 : digits
    const formatOptions = useMemo(
      () => ({ minimumFractionDigits: fraction, maximumFractionDigits: fraction }),
      [fraction],
    )
    return (
      <NumberField
        ref={ref}
        locale={locale}
        min={min}
        step={fraction ? 1 / 10 ** fraction : 1}
        largeStep={fraction ? 10 : 100}
        formatOptions={formatOptions}
        stepper="none"
        leading={
          <span aria-hidden="true" className="min-w-[1ch] font-medium">
            {symbol}
          </span>
        }
        trailing={
          showCode ? (
            <span
              className={cx(
                "kg-currency-input__code px-[0.45em] py-[0.2em] rounded-kg-xs border border-kg-ink",
                "bg-kg-muted text-kg-xs font-semibold tracking-[0.04em] text-kg-fg-muted",
              )}
            >
              {currency}
            </span>
          ) : undefined
        }
        className={cx("kg-currency-input [&_input]:text-end", className)}
        {...props}
      />
    )
  },
)

CurrencyInput.displayName = "CurrencyInput"
