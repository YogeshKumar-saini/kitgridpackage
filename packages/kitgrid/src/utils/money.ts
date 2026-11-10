export interface MoneyFormatOptions {
  currency?: string
  locale?: string | undefined
  /** Drop `.00` on whole amounts. */
  trimZeros?: boolean
  display?: "symbol" | "narrowSymbol" | "code" | "name"
}

const cache = new Map<string, Intl.NumberFormat>()

export const getMoneyFormatter = ({
  currency = "USD",
  locale,
  trimZeros = false,
  display = "symbol",
}: MoneyFormatOptions = {}): Intl.NumberFormat => {
  const key = `${locale ?? ""}|${currency}|${trimZeros}|${display}`
  let formatter = cache.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: display,
      ...(trimZeros ? { trailingZeroDisplay: "stripIfInteger" } : {}),
    } as Intl.NumberFormatOptions)
    cache.set(key, formatter)
  }
  return formatter
}

export const formatMoney = (amount: number, options?: MoneyFormatOptions): string =>
  getMoneyFormatter(options).format(amount)

/** Whole-number percentage saved, or 0 when there is no discount. */
export const discountPercent = (
  amount: number,
  compareAt: number | undefined,
): number =>
  compareAt && compareAt > amount
    ? Math.round(((compareAt - amount) / compareAt) * 100)
    : 0
