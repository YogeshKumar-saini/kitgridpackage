import { render, screen } from "@testing-library/react"
import { Stat } from "./stat.js"

describe("Stat", () => {
  it("pairs label and value in a description list", () => {
    render(<Stat label="Revenue" value="$48,120" />)
    expect(screen.getByRole("term")).toHaveTextContent("Revenue")
    expect(screen.getByRole("definition")).toHaveTextContent("$48,120")
  })

  it("reads the delta direction in words and tones it", () => {
    const { container } = render(
      <Stat label="Orders" value="1,204" delta={12} helper="vs last month" />,
    )
    const delta = container.querySelector(".kg-stat__delta") as HTMLElement
    expect(delta).toHaveTextContent("up 12%")
    expect(delta).toHaveAttribute("data-tone", "positive")
    expect(screen.getByText("vs last month")).toBeInTheDocument()
  })

  it("treats a fall as good with invertDelta", () => {
    const { container } = render(
      <Stat label="Churn" value="2.1%" delta={-0.45} invertDelta />,
    )
    const delta = container.querySelector(".kg-stat__delta") as HTMLElement
    expect(delta).toHaveTextContent("down 0.5%")
    expect(delta).toHaveAttribute("data-trend", "down")
    expect(delta).toHaveAttribute("data-tone", "positive")
  })

  it("draws a hidden sparkline, or a named one when labelled", () => {
    const { container, rerender } = render(
      <Stat label="Visitors" value="9.8k" trend={[3, 5, 4, 8]} />,
    )
    const trend = container.querySelector(".kg-stat__trend") as HTMLElement
    expect(trend).toHaveAttribute("aria-hidden", "true")
    expect(trend.querySelector(".kg-stat__trend-line")?.getAttribute("d")).toMatch(
      /^M0 /,
    )

    rerender(
      <Stat
        label="Visitors"
        value="9.8k"
        trend={[3, 5]}
        trendLabel="Rising this week"
      />,
    )
    expect(screen.getByRole("img", { name: "Rising this week" })).toBeInTheDocument()
  })

  it("skips the sparkline with fewer than two points", () => {
    const { container } = render(<Stat label="Visitors" value="9.8k" trend={[3]} />)
    expect(container.querySelector(".kg-stat__trend")).toBeNull()
  })
})
