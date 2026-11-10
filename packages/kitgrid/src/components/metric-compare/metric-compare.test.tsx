import { render, screen } from "@testing-library/react"
import { MetricCompare } from "./metric-compare.js"

describe("MetricCompare", () => {
  it("lists both periods as term and value pairs", () => {
    render(
      <MetricCompare
        label="Signups"
        current={{ label: "March", value: 1240 }}
        previous={{ label: "February", value: 1000 }}
      />,
    )
    expect(screen.getAllByRole("term").map((t) => t.textContent)).toEqual([
      "March",
      "February",
    ])
    expect(screen.getByText("1,240")).toBeInTheDocument()
    expect(screen.getByText("+24.0%")).toHaveAttribute("data-tone", "positive")
  })

  it("treats a fall as good when inverted", () => {
    render(
      <MetricCompare
        label="p95"
        invert
        current={{ label: "Now", value: 180 }}
        previous={{ label: "Before", value: 240 }}
        format={(n) => `${n} ms`}
      />,
    )
    const change = screen.getByText("-25.0%")
    expect(change).toHaveAttribute("data-tone", "positive")
    expect(change).toHaveAttribute("data-trend", "down")
  })

  it("labels a change from zero as new", () => {
    render(
      <MetricCompare
        label="Refunds"
        current={{ label: "Now", value: 3 }}
        previous={{ label: "Before", value: 0 }}
      />,
    )
    expect(screen.getByText("new")).toBeInTheDocument()
  })
})
