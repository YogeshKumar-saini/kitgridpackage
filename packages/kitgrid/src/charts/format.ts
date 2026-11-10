export type ChartFormatter = (value: number) => string

/**
 * How values print on axes, labels, tooltips and the data table. A preset or
 * `Intl.NumberFormatOptions` stays serializable; a function is the escape hatch.
 */
export type ChartFormat =
  | "number"
  | "compact"
  | "percent"
  | "currency"
  | Intl.NumberFormatOptions
  | ChartFormatter

// Fixed locale so the server-rendered data table matches the client's.
const LOCALE = "en-US"
const cache = new Map<string, Intl.NumberFormat>()

const formatter = (options: Intl.NumberFormatOptions): Intl.NumberFormat => {
  const key = JSON.stringify(options)
  let entry = cache.get(key)
  if (!entry) {
    entry = new Intl.NumberFormat(LOCALE, options)
    cache.set(key, entry)
  }
  return entry
}

export interface FormatCompactOptions {
  /** ISO code such as `"USD"`; prints a currency symbol. */
  currency?: string
  digits?: number
}

/** `1234567` → `1.2M`, `-48200` → `-48.2K`. */
export const formatCompact = (
  value: number,
  { currency, digits = 1 }: FormatCompactOptions = {},
): string =>
  formatter({
    notation: "compact",
    maximumFractionDigits: digits,
    ...(currency ? { style: "currency", currency } : {}),
  }).format(value)

/** A ratio printed as a percentage: `0.124` → `12.4%`. */
export const formatPercent = (value: number, digits = 1): string =>
  formatter({ style: "percent", maximumFractionDigits: digits }).format(value)

export const toFormatter = (format: ChartFormat = "compact"): ChartFormatter => {
  if (typeof format === "function") return format
  if (format === "compact") return (value) => formatCompact(value)
  if (format === "percent") return (value) => formatPercent(value)
  if (format === "currency") return (value) => formatCompact(value, { currency: "USD" })
  const intl = formatter(format === "number" ? { maximumFractionDigits: 2 } : format)
  return (value) => intl.format(value)
}
