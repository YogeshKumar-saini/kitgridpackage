import { render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { UptimeBars, type UptimeBarsDay } from "./uptime-bars.js"

const days: UptimeBarsDay[] = [
  { date: "2026-10-22", status: "up", uptime: 100 },
  { date: "2026-10-23", status: "degraded", uptime: 99.2, note: "Slow queries" },
  { date: "2026-10-24", status: "up", uptime: 100 },
]

describe("UptimeBars", () => {
  it("labels every day and summarises mean uptime", () => {
    render(<UptimeBars label="API" days={days} locale="en-US" />)
    const list = screen.getByRole("list", { name: "API" })
    const bars = within(list).getAllByRole("listitem")
    expect(bars).toHaveLength(3)
    expect(bars[1]).toHaveTextContent("Oct 23, Degraded, 99.20%, Slow queries")
    expect(screen.getByText("99.73%")).toBeInTheDocument()
  })

  it("starts on today and walks days with the arrow keys", async () => {
    const user = userEvent.setup()
    render(<UptimeBars label="API" days={days} locale="en-US" />)
    const bars = screen.getAllByRole("listitem")
    await user.tab()
    expect(bars[2]).toHaveFocus()
    await user.keyboard("{ArrowLeft}")
    expect(bars[1]).toHaveFocus()
    expect(bars[1]).toHaveAttribute("tabindex", "0")
    expect(bars[2]).toHaveAttribute("tabindex", "-1")
    await user.keyboard("{Home}")
    expect(bars[0]).toHaveFocus()
  })
})
