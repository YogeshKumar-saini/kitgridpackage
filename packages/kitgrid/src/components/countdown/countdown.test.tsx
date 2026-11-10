import { act, render, screen } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { Countdown, getCountdownParts } from "./countdown.js"

const START = new Date("2026-10-23T10:00:00Z").getTime()
const HOUR = 3_600_000

/** Reads the rolling digits back as text, e.g. "02:14:09". */
const clock = (container: HTMLElement) =>
  [...container.querySelectorAll(".kg-countdown__clock .kg-countdown__segment")]
    .map((segment) =>
      [...segment.childNodes]
        .map((node) => {
          const element = node as HTMLElement
          if (element.classList.contains("kg-rolling-digits")) {
            return [...element.children]
              .map(
                (digit) =>
                  (digit as HTMLElement).style.getPropertyValue("--_digit") ||
                  digit.textContent,
              )
              .join("")
          }
          return element.textContent
        })
        .join(""),
    )
    .join("")

// Each tick schedules the next one from an effect, so time has to advance in small steps.
const advance = (ms: number) => {
  for (let elapsed = 0; elapsed < ms; elapsed += 250) {
    act(() => {
      jest.advanceTimersByTime(Math.min(250, ms - elapsed))
    })
  }
}

describe("Countdown", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(START)
  })
  afterEach(() => jest.useRealTimers())

  it("splits milliseconds into parts", () => {
    expect(getCountdownParts(2 * 86_400_000 + 3 * HOUR + 4 * 60_000 + 5_500)).toEqual({
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
      total: 2 * 86_400_000 + 3 * HOUR + 4 * 60_000 + 5_500,
    })
    expect(getCountdownParts(-10).total).toBe(0)
  })

  it("renders a stable placeholder on the server", () => {
    const html = renderToString(<Countdown endsAt={START + HOUR} />)
    expect(html).toContain('data-state="pending"')
    expect(html).toContain("--")
    expect(html).not.toContain("kg-rolling-digits")
  })

  it("ticks once mounted and exposes a timer", () => {
    const { container } = render(
      <Countdown endsAt={START + 2 * HOUR + 14 * 60_000 + 9_000} />,
    )
    expect(screen.getByRole("timer")).toHaveAttribute("data-state", "running")
    expect(clock(container)).toBe("02:14:09")
    advance(1000)
    expect(clock(container)).toBe("02:14:08")
    advance(9000)
    expect(clock(container)).toBe("02:13:59")
  })

  it("accepts Date, number and ISO string", () => {
    const iso = new Date(START + 90_000).toISOString()
    const { container, rerender } = render(<Countdown endsAt={iso} />)
    expect(clock(container)).toBe("00:01:30")
    rerender(<Countdown endsAt={new Date(START + 60_000)} />)
    expect(clock(container)).toBe("00:01:00")
  })

  it("shows days inline with a suffix", () => {
    const { container } = render(<Countdown endsAt={START + 2 * 86_400_000 + 5_000} />)
    expect(clock(container)).toBe("2d00:00:05")
  })

  it("updates screen-reader text at most once a minute", () => {
    render(<Countdown endsAt={START + 2 * HOUR + 10 * 60_000 + 30_000} />)
    const timer = screen.getByRole("timer")
    expect(timer).toHaveTextContent("Ends in 2 hours, 10 minutes")
    advance(20_000)
    expect(timer).toHaveTextContent("Ends in 2 hours, 10 minutes")
    advance(11_000)
    expect(timer).toHaveTextContent("Ends in 2 hours, 9 minutes")
  })

  it("says less than a minute near the end", () => {
    render(<Countdown endsAt={START + 30_000} />)
    expect(screen.getByRole("timer")).toHaveTextContent("Ends in less than a minute")
  })

  it("completes once and shows the expired label", () => {
    const onComplete = jest.fn()
    render(
      <Countdown
        endsAt={START + 3_000}
        onComplete={onComplete}
        expiredLabel="Sale over"
      />,
    )
    advance(2_000)
    expect(onComplete).not.toHaveBeenCalled()
    advance(1_100)
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Sale over")).toBeInTheDocument()
    expect(screen.queryByRole("timer")).toBeNull()
    advance(10_000)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it("treats an end in the past as already expired", () => {
    const onComplete = jest.fn()
    render(<Countdown endsAt={START - 1} onComplete={onComplete} />)
    expect(screen.getByText("Offer ended")).toBeInTheDocument()
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it("renders labelled blocks and can hide zero leading units", () => {
    const { container, rerender } = render(
      <Countdown variant="blocks" endsAt={START + 5 * 60_000} />,
    )
    const units = () =>
      [...container.querySelectorAll(".kg-countdown__unit")].map(
        (unit) => unit.textContent,
      )
    expect(units()).toEqual(["Days", "Hours", "Mins", "Secs"])
    rerender(<Countdown variant="blocks" endsAt={START + 5 * 60_000} hideZeroUnits />)
    expect(units()).toEqual(["Mins", "Secs"])
    rerender(
      <Countdown
        variant="blocks"
        endsAt={START + 5 * 60_000}
        showSeconds={false}
        labels={{ units: { minutes: "Min" } }}
      />,
    )
    expect(units()).toEqual(["Days", "Hours", "Min"])
  })

  it("pauses ticking while the document is hidden", () => {
    const hidden = jest.spyOn(document, "hidden", "get")
    const { container } = render(<Countdown endsAt={START + HOUR} />)
    expect(clock(container)).toBe("01:00:00")
    hidden.mockReturnValue(true)
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"))
    })
    advance(5_000)
    expect(clock(container)).toBe("01:00:00")
    hidden.mockReturnValue(false)
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"))
    })
    advance(1_000)
    expect(clock(container)).toBe("00:59:54")
    hidden.mockRestore()
  })
})
