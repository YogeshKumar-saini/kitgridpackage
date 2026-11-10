import { fireEvent, render, screen } from "@testing-library/react"
import { InsightList, type InsightListItem } from "./insight-list.js"

const items: InsightListItem[] = Array.from({ length: 7 }, (_, index) => ({
  id: String(index),
  title: `Finding ${index + 1}`,
  direction: index % 2 ? "down" : "up",
  severity: index === 0 ? "high" : "low",
  impact: (index + 1) * 1000,
  impactLabel: `$${index + 1}k`,
}))

describe("InsightList", () => {
  it("writes the severity and tones each finding by direction", () => {
    render(<InsightList items={items} />)
    const [first, second] = screen.getAllByRole("listitem")
    expect(first).toHaveTextContent("Finding 1Severity: High$1k")
    expect(first).toHaveAttribute("data-tone", "positive")
    expect(second).toHaveAttribute("data-tone", "negative")
  })

  it("scales impact bars against the largest impact", () => {
    render(<InsightList items={items} maxVisible={10} />)
    const bars = document.querySelectorAll<HTMLElement>(".kg-insight-list__bar")
    expect(bars[6]?.style.getPropertyValue("--_share")).toBe("1")
    expect(Number(bars[0]?.style.getPropertyValue("--_share"))).toBeCloseTo(1 / 7)
  })

  it("folds long lists behind a disclosure button", () => {
    render(<InsightList items={items} maxVisible={3} />)
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
    const more = screen.getByRole("button", { name: "Show all 7" })
    expect(more).toHaveAttribute("aria-expanded", "false")
    fireEvent.click(more)
    expect(screen.getAllByRole("listitem")).toHaveLength(7)
    expect(screen.getByRole("button", { name: "Show fewer" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
  })

  it("shows the empty slot", () => {
    render(<InsightList items={[]} empty="Nothing moved enough to report" />)
    expect(screen.getByText("Nothing moved enough to report")).toBeInTheDocument()
  })
})
