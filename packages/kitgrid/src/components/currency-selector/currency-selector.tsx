import { forwardRef } from "react"
import { cx } from "../../utils/cx.js"
import { getMoneyFormatter } from "../../utils/money.js"
import { Select, type SelectProps } from "../select/select.js"

export interface CurrencySelectorCurrency {
  /** ISO 4217 code, e.g. "EUR". */
  code: string
  /** Defaults to the localized currency name. */
  label?: string
}

export interface CurrencySelectorProps extends Omit<SelectProps, "options"> {
  currencies: readonly (CurrencySelectorCurrency | string)[]
  /** Locale for names and symbols. */
  locale?: string
  /** Show only the code in each option, for tight headers. */
  compact?: boolean
}

const symbolFor = (code: string, locale?: string) =>
  getMoneyFormatter({ currency: code, locale, display: "narrowSymbol" })
    .formatToParts(0)
    .find((part) => part.type === "currency")?.value ?? code

const nameFor = (code: string, locale?: string) => {
  try {
    return new Intl.DisplayNames(locale ? [locale] : undefined, { type: "currency" }).of(code) ?? code
  } catch {
    return code
  }
}

/** Store currency picker built on Select, with localized names and a symbol badge per option. */
export const CurrencySelector = forwardRef<HTMLButtonElement, CurrencySelectorProps>(
  (
    {
      currencies,
      locale,
      compact = false,
      className,
      "aria-label": ariaLabel = "Currency",
      ...props
    },
    ref,
  ) => (
    <Select
      ref={ref}
      aria-label={ariaLabel}
      className={cx("kg-currency-selector", className)}
      data-compact={compact || undefined}
      options={currencies.map((entry) => {
        const currency = typeof entry === "string" ? { code: entry } : entry
        const name = currency.label ?? nameFor(currency.code, locale)
        return {
          value: currency.code,
          label: compact ? currency.code : `${currency.code} · ${name}`,
          icon: (
            <span
              className="kg-currency-selector__symbol inline-grid place-items-center min-w-6 h-6 px-1 rounded-full bg-kg-paper-sage text-kg-xs font-bold leading-none text-kg-fg"
              aria-hidden="true"
            >
              {symbolFor(currency.code, locale)}
            </span>
          ),
        }
      })}
      {...props}
    />
  ),
)

CurrencySelector.displayName = "CurrencySelector"
