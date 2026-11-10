import { act, render, screen } from "@testing-library/react"
import { RelativeTime } from "./relative-time.js"

const now = new Date("2026-03-10T12:00:00Z")

describe("RelativeTime", () => {
  it("renders a machine-readable time with an absolute title", () => {
    render(<RelativeTime date="2026-03-10T11:57:00Z" now={now} />)
    const time = screen.getByText("3 minutes ago")
    expect(time.tagName).toBe("TIME")
    expect(time).toHaveAttribute("datetime", "2026-03-10T11:57:00.000Z")
    expect(time.getAttribute("title")).toMatch(/2026/)
  })

  it("uses words for near distances and future dates", () => {
    render(
      <>
        <RelativeTime date="2026-03-10T11:59:50Z" now={now} />
        <RelativeTime date="2026-03-11T12:00:00Z" now={now} />
        <RelativeTime date="2026-03-12T12:00:00Z" now={now} formatStyle="short" />
      </>,
    )
    expect(screen.getByText("now")).toBeInTheDocument()
    expect(screen.getByText("tomorrow")).toBeInTheDocument()
    expect(screen.getByText("in 2 days")).toBeInTheDocument()
  })

  it("switches to an absolute date past the threshold", () => {
    render(<RelativeTime date="2025-12-01T12:00:00Z" now={now} absoluteAfterDays={30} />)
    expect(screen.getByText("Dec 1, 2025")).toBeInTheDocument()
  })

  it("refreshes itself while live", () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2026-03-10T12:00:00Z"))
    render(<RelativeTime date="2026-03-10T11:59:30Z" />)
    expect(screen.getByText("now")).toBeInTheDocument()
    act(() => {
      jest.setSystemTime(new Date("2026-03-10T12:02:00Z"))
      jest.advanceTimersByTime(10_000)
    })
    expect(screen.getByText("3 minutes ago")).toBeInTheDocument()
    jest.useRealTimers()
  })
})
