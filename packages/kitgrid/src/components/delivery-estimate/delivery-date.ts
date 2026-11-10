export interface DeliveryEstimateOptions {
  now: Date | number
  /** Business days in transit, at the earliest. */
  minDays: number
  /** Business days in transit, at the latest. Defaults to `minDays`. */
  maxDays?: number | undefined
  /** Business days spent packing before the parcel ships. */
  handlingDays?: number | undefined
  /** Skip Saturdays and Sundays when counting. */
  skipWeekends?: boolean | undefined
  /** Days with no shipping or delivery: Dates, or "YYYY-MM-DD" strings in the store's calendar. */
  holidays?: readonly (Date | string)[] | undefined
  /** Daily order cutoff in 24h "HH:MM". Orders after it ship the next business day. */
  cutoff?: string | undefined
  /** IANA zone the store works in, e.g. "America/New_York". Defaults to the runtime's zone. */
  timeZone?: string | undefined
}

/**
 * Calendar days are returned as Dates at UTC midnight, so they format identically on every
 * machine when formatted with `timeZone: "UTC"`.
 */
export interface DeliveryEstimateDates {
  ordered: Date
  shipped: Date
  earliest: Date
  latest: Date
  /** Minutes left to order for today's dispatch, or `null` once it has passed (or no cutoff). */
  cutoffMinutes: number | null
}

const DAY = 86_400_000
const partsCache = new Map<string, Intl.DateTimeFormat>()

const wallClock = (date: Date, timeZone: string | undefined) => {
  const key = timeZone ?? ""
  let format = partsCache.get(key)
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    })
    partsCache.set(key, format)
  }
  const parts: Record<string, number> = {}
  for (const part of format.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value)
  }
  return {
    day: Date.UTC(parts.year ?? 1970, (parts.month ?? 1) - 1, parts.day ?? 1),
    minutes: ((parts.hour ?? 0) % 24) * 60 + (parts.minute ?? 0),
  }
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/

const dayKey = (value: Date | string, timeZone: string | undefined): number => {
  if (typeof value === "string") {
    const match = ISO_DAY.exec(value)
    if (match) return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    return wallClock(new Date(value), timeZone).day
  }
  return wallClock(value, timeZone).day
}

const parseCutoff = (cutoff: string): number | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(cutoff.trim())
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

/** Ship and delivery dates for an order placed at `now`, counted in business days. */
export const getDeliveryEstimate = ({
  now,
  minDays,
  maxDays = minDays,
  handlingDays = 0,
  skipWeekends = true,
  holidays = [],
  cutoff,
  timeZone,
}: DeliveryEstimateOptions): DeliveryEstimateDates => {
  const clock = wallClock(new Date(now), timeZone)
  const closed = new Set(holidays.map((holiday) => dayKey(holiday, timeZone)))

  const isBusinessDay = (day: number) => {
    const weekday = new Date(day).getUTCDay()
    if (skipWeekends && (weekday === 0 || weekday === 6)) return false
    return !closed.has(day)
  }

  const addBusinessDays = (start: number, count: number) => {
    let day = start
    let left = Math.max(0, Math.floor(count))
    // Bounded so a calendar with no business days at all can't hang the page.
    for (let guard = 0; left > 0 && guard < 3660; guard++) {
      day += DAY
      if (isBusinessDay(day)) left--
    }
    return day
  }

  const cutoffAt = cutoff === undefined ? null : parseCutoff(cutoff)
  const today = clock.day
  const shipsToday =
    isBusinessDay(today) && (cutoffAt === null || clock.minutes < cutoffAt)
  const dispatch = addBusinessDays(
    shipsToday ? today : addBusinessDays(today, 1),
    handlingDays,
  )

  return {
    ordered: new Date(today),
    shipped: new Date(dispatch),
    earliest: new Date(addBusinessDays(dispatch, minDays)),
    latest: new Date(addBusinessDays(dispatch, Math.max(minDays, maxDays))),
    cutoffMinutes: cutoffAt !== null && shipsToday ? cutoffAt - clock.minutes : null,
  }
}
