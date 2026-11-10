import { act, render, screen } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { getDeliveryEstimate } from "./delivery-date.js"
import { DeliveryEstimate } from "./delivery-estimate.js"

// Friday 23 October 2026, 10:48 UTC.
const FRIDAY = Date.UTC(2026, 9, 23, 10, 48)
const iso = (date: Date) => date.toISOString().slice(0, 10)
const base = { timeZone: "UTC", minDays: 3 } as const
const props = { ...base, locale: "en-US" } as const

describe("getDeliveryEstimate", () => {
  it("ships today before the cutoff and counts business days", () => {
    const dates = getDeliveryEstimate({ ...base, now: FRIDAY, cutoff: "14:00" })
    expect(iso(dates.shipped)).toBe("2026-10-23")
    expect(iso(dates.earliest)).toBe("2026-10-28")
    expect(dates.cutoffMinutes).toBe(192)
  })

  it("ships the next business day after the cutoff", () => {
    const dates = getDeliveryEstimate({
      ...base,
      now: Date.UTC(2026, 9, 23, 15),
      cutoff: "14:00",
    })
    expect(iso(dates.shipped)).toBe("2026-10-26")
    expect(iso(dates.earliest)).toBe("2026-10-29")
    expect(dates.cutoffMinutes).toBeNull()
  })

  it("skips weekends and holidays, or only holidays when weekends count", () => {
    const saturday = getDeliveryEstimate({ ...base, now: Date.UTC(2026, 9, 24, 9) })
    expect(iso(saturday.shipped)).toBe("2026-10-26")
    const holiday = getDeliveryEstimate({
      ...base,
      now: FRIDAY,
      holidays: ["2026-10-26"],
    })
    expect(iso(holiday.earliest)).toBe("2026-10-29")
    const everyDay = getDeliveryEstimate({ ...base, now: FRIDAY, skipWeekends: false })
    expect(iso(everyDay.earliest)).toBe("2026-10-26")
  })

  it("works in the store's time zone, not the machine's", () => {
    // 23:30 UTC on Friday is already 05:00 on Saturday in Kolkata.
    const dates = getDeliveryEstimate({
      minDays: 1,
      now: Date.UTC(2026, 9, 23, 23, 30),
      timeZone: "Asia/Kolkata",
    })
    expect(iso(dates.ordered)).toBe("2026-10-24")
    expect(iso(dates.shipped)).toBe("2026-10-26")
  })

  it("adds handling days and returns a range", () => {
    const dates = getDeliveryEstimate({
      ...base,
      now: FRIDAY,
      maxDays: 5,
      handlingDays: 1,
    })
    expect(iso(dates.shipped)).toBe("2026-10-26")
    expect(iso(dates.earliest)).toBe("2026-10-29")
    expect(iso(dates.latest)).toBe("2026-11-02")
  })
})

describe("DeliveryEstimate", () => {
  it("adds cutoff urgency with a formatted date", () => {
    render(<DeliveryEstimate {...props} now={FRIDAY} cutoff="14:00" />)
    expect(screen.getByText(/Order within/)).toHaveTextContent(
      "Order within 3h 12m to get it by Wed, Oct 28",
    )
  })

  it("drops the urgency after the cutoff and formats ranges", () => {
    render(
      <DeliveryEstimate
        {...props}
        maxDays={5}
        now={Date.UTC(2026, 9, 23, 16)}
        cutoff="14:00"
      />,
    )
    expect(screen.getByText(/Get it/).textContent).toMatch(
      /^Get it Thu, Oct 29\s*–\s*Mon, Nov 2$/,
    )
  })

  it("is deterministic on the server when given now, and a placeholder otherwise", () => {
    const fixed = renderToString(<DeliveryEstimate {...props} now={FRIDAY} />)
    expect(fixed).toContain("Wed, Oct 28")
    const live = renderToString(<DeliveryEstimate {...props} />)
    expect(live).toContain('data-state="pending"')
    expect(live).toContain("Calculating delivery date")
  })

  it("computes after mount and refreshes every minute without now", () => {
    jest.useFakeTimers()
    jest.setSystemTime(Date.UTC(2026, 9, 23, 13, 58, 30))
    render(<DeliveryEstimate {...props} cutoff="14:00" />)
    expect(screen.getByText(/Order within/)).toHaveTextContent("Order within 2m")
    act(() => {
      jest.advanceTimersByTime(60_000)
    })
    expect(screen.getByText(/Order within/)).toHaveTextContent("Order within 1m")
    act(() => {
      jest.advanceTimersByTime(60_000)
    })
    expect(screen.getByText(/Get it/)).toHaveTextContent("Get it by Thu, Oct 29")
    jest.useRealTimers()
  })

  it("shows an ordered → shipped → delivered timeline in the detailed variant", () => {
    render(
      <DeliveryEstimate
        {...props}
        maxDays={5}
        now={FRIDAY}
        cutoff="14:00"
        variant="detailed"
      />,
    )
    const timeline = screen.getByRole("list", { name: "Delivery timeline" })
    const steps = [...timeline.querySelectorAll("li")].map((step) => step.textContent)
    expect(steps[0]).toBe("OrderedToday")
    expect(steps[1]).toBe("ShippedToday")
    expect(steps[2]).toMatch(/^DeliveredOct 28\s*–\s*30$/)
  })

  it("formats per locale and accepts custom copy", () => {
    render(
      <DeliveryEstimate
        {...base}
        now={FRIDAY}
        locale="de-DE"
        labels={{ message: ({ date }) => `Lieferung bis ${date}` }}
      />,
    )
    expect(screen.getByText(/Lieferung bis/)).toHaveTextContent(
      "Lieferung bis Mi., 28. Okt.",
    )
  })
})
