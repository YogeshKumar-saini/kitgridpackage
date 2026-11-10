import { forwardRef, type HTMLAttributes } from "react"
import { cx } from "../../utils/cx.js"

export type FormattedNumberFormat = "decimal" | "compact" | "percent" | "currency" | "unit" | "bytes"
export type FormattedNumberTone = "neutral" | "signed"

export interface FormattedNumberProps
  extends Omit<HTMLAttributes<HTMLDataElement>, "children"> {
  value: number
  format?: FormattedNumberFormat
  /** ISO 4217 code for `currency`. */
  currency?: string
  /** A sanctioned unit for `unit`, such as `kilometer-per-hour` or `millisecond`. */
  unit?: string
  /** Fixed by default so the server and the browser print the same string. */
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  /** `percent` treats 0.42 as 42% by default; pass true when the value is already 42. */
  percentOfHundred?: boolean
  signDisplay?: "auto" | "always" | "exceptZero" | "never"
  /** `signed` colors positive and negative values; the sign keeps the meaning in text. */
  tone?: FormattedNumberTone
  /** Shown when the value is not finite. */
  fallback?: string
}

const BYTE_UNITS = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte", "petabyte"]

const toParts = (props: FormattedNumberProps): string => {
  const {
    value,
    format = "decimal",
    currency = "USD",
    unit = "meter",
    locale = "en-US",
    minimumFractionDigits,
    maximumFractionDigits,
    percentOfHundred = false,
    signDisplay = "auto",
  } = props
  const digits = {
    ...(minimumFractionDigits !== undefined && { minimumFractionDigits }),
    ...(maximumFractionDigits !== undefined && { maximumFractionDigits }),
  }
  switch (format) {
    case "compact":
      return new Intl.NumberFormat(locale, {
        notation: "compact",
        maximumFractionDigits: 1,
        signDisplay,
        ...digits,
      }).format(value)
    case "percent":
      return new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 1,
        signDisplay,
        ...digits,
      }).format(percentOfHundred ? value / 100 : value)
    case "currency":
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        signDisplay,
        ...digits,
      }).format(value)
    case "unit":
      return new Intl.NumberFormat(locale, {
        style: "unit",
        unit,
        unitDisplay: "short",
        signDisplay,
        ...digits,
      }).format(value)
    case "bytes": {
      let size = Math.abs(value)
      let index = 0
      while (size >= 1024 && index < BYTE_UNITS.length - 1) {
        size /= 1024
        index++
      }
      return new Intl.NumberFormat(locale, {
        style: "unit",
        unit: BYTE_UNITS[index] ?? "byte",
        unitDisplay: "short",
        maximumFractionDigits: index === 0 ? 0 : 1,
        signDisplay,
        ...digits,
      }).format(Math.sign(value) * size)
    }
    default:
      return new Intl.NumberFormat(locale, { signDisplay, ...digits }).format(value)
  }
}

/** A number formatted with `Intl.NumberFormat`, wrapped in `<data>` with the raw value. */
export const FormattedNumber = forwardRef<HTMLDataElement, FormattedNumberProps>(
  (props, ref) => {
    const {
      value,
      format = "decimal",
      currency: _currency,
      unit: _unit,
      locale: _locale,
      minimumFractionDigits: _min,
      maximumFractionDigits: _max,
      percentOfHundred: _pct,
      signDisplay: _sign,
      tone = "neutral",
      fallback = "-",
      className,
      ...rest
    } = props
    const finite = Number.isFinite(value)
    const text = finite ? toParts(props) : fallback
    const sign = !finite || value === 0 ? "zero" : value > 0 ? "positive" : "negative"
    return (
      <data
        ref={ref}
        value={finite ? String(value) : undefined}
        className={cx(
          "kg-formatted-number whitespace-nowrap tabular-nums data-[tone=signed]:data-[sign=positive]:text-[color-mix(in_oklab,var(--kg-success)_80%,var(--kg-fg))] data-[tone=signed]:data-[sign=negative]:text-[color-mix(in_oklab,var(--kg-danger)_80%,var(--kg-fg))]",
          className,
        )}
        data-format={format}
        data-tone={tone}
        data-sign={sign}
        {...rest}
      >
        {text}
      </data>
    )
  },
)
FormattedNumber.displayName = "FormattedNumber"
