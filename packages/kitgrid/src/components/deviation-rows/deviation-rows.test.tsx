import { render, screen, within } from "@testing-library/react"
import { DeviationRows } from "./deviation-rows.js"

describe("DeviationRows", () => {
  it("lists every row with a signed figure, centred when gaps fall on both sides", () => {
    const { container } = render(
      <DeviationRows
        caption="Store vs region"
        rows={[
          { label: "Conversion", detail: "3.4% vs 3.0%", value: 13.3 },
          { label: "Basket size", value: -8.25 },
          { label: "Returns", value: null },
        ]}
      />,
    )
    const list = screen.getByRole("list", { name: "Store vs region" })
    const [up, down, none] = within(list).getAllByRole("listitem")
    expect(up).toHaveTextContent("Conversion3.4% vs 3.0%+13.3%")
    expect(up).toHaveAttribute("data-tone", "positive")
    expect(down).toHaveTextContent("−8.3%")
    expect(down).toHaveAttribute("data-tone", "negative")
    expect(none).toHaveTextContent("n/a")
    expect(container.firstElementChild).toHaveAttribute("data-origin", "center")
    expect(screen.getByText(/to \+15%/)).toBeInTheDocument()
  })

  it("pins the zero line to one edge when every gap shares a sign, and inverts tone", () => {
    const { container } = render(
      <DeviationRows
        invert
        max={50}
        rows={[
          { label: "Latency", value: 20 },
          { label: "Errors", value: 10, caveat: "Logging changed on Oct 2" },
        ]}
      />,
    )
    const rows = screen.getAllByRole("listitem")
    expect(container.firstElementChild).toHaveAttribute("data-origin", "start")
    expect(rows[0]).toHaveAttribute("data-tone", "negative")
    expect(rows[1]).toHaveAttribute("data-tone", "neutral")
    const bar = rows[0]?.querySelector(".kg-deviation-rows__bar") as HTMLElement
    expect(bar.style.getPropertyValue("--_size")).toBe("40%")
  })

  it("prints multiples past a doubling", () => {
    render(<DeviationRows rows={[{ label: "Signups", value: 140 }]} />)
    expect(screen.getByText("2.4×")).toBeInTheDocument()
  })
})
