export type ChatThreadDate = Date | number | string

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

/** Whole calendar days between `date` and `now`, in local time. */
export const daysAgo = (date: ChatThreadDate, now: Date = new Date()): number =>
  Math.round((startOfDay(now) - startOfDay(new Date(date))) / 86_400_000)

/** "Today", "Yesterday", a weekday within the week, then a date. Localised through Intl. */
export const dayLabel = (
  date: ChatThreadDate,
  now: Date = new Date(),
  locale?: string,
): string => {
  const value = new Date(date)
  const days = daysAgo(value, now)
  if (days === 0 || days === 1) {
    const text = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
      -days,
      "day",
    )
    return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1)
  }
  if (days > 1 && days < 7)
    return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(value)
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    ...(value.getFullYear() === now.getFullYear() ? null : { year: "numeric" }),
  }).format(value)
}
