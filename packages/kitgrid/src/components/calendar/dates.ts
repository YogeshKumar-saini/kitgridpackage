/*
 * Calendar dates stay `yyyy-mm-dd` strings read as UTC midnight, so no time zone or DST
 * transition ever shifts a day. Plain string comparison orders them.
 */

const DAY_MS = 86_400_000

export const parseDay = (day: string): Date => new Date(`${day}T00:00:00Z`)
export const isoDay = (date: Date): string => date.toISOString().slice(0, 10)
export const isValidDay = (day: string | null | undefined): day is string =>
  typeof day === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(day) &&
  !Number.isNaN(parseDay(day).getTime()) &&
  isoDay(parseDay(day)) === day

export const addDays = (day: string, days: number): string =>
  isoDay(new Date(parseDay(day).getTime() + days * DAY_MS))

/** Same day number in another month, clamped to that month's last day. */
export const addMonths = (day: string, months: number): string => {
  const date = parseDay(day)
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate()
  target.setUTCDate(Math.min(date.getUTCDate(), last))
  return isoDay(target)
}

export const startOfMonth = (day: string): string => `${day.slice(0, 7)}-01`
export const dayOfWeek = (day: string): number => parseDay(day).getUTCDay()
export const sameMonth = (a: string, b: string): boolean => a.slice(0, 7) === b.slice(0, 7)

export const localToday = (): string => {
  const now = new Date()
  return isoDay(new Date(now.getTime() - now.getTimezoneOffset() * 60_000))
}

export const clampDay = (day: string, min?: string, max?: string): string =>
  min && day < min ? min : max && day > max ? max : day

/** Six full weeks starting on `weekStartsOn`, so the grid never changes height. */
export const monthGrid = (month: string, weekStartsOn: number): string[][] => {
  const first = startOfMonth(month)
  const start = addDays(first, -((dayOfWeek(first) - weekStartsOn + 7) % 7))
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day)),
  )
}

interface WeekInfoLocale extends Intl.Locale {
  weekInfo?: { firstDay: number }
  getWeekInfo?: () => { firstDay: number }
}

/** First day of the week for a locale (0 = Sunday), falling back to Sunday. */
export const localeWeekStart = (locale?: string): number => {
  try {
    const resolved = new Intl.DateTimeFormat(locale).resolvedOptions().locale
    const info = new Intl.Locale(resolved) as WeekInfoLocale
    const firstDay = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay
    return firstDay === undefined ? 0 : firstDay % 7
  } catch {
    return 0
  }
}

export const formatDay = (
  day: string,
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
): string =>
  new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(parseDay(day))
