import { render, screen } from "@testing-library/react"
import { UsageMeter } from "./usage-meter.js"

describe("UsageMeter", () => {
  it("exposes a labelled meter with value text", () => {
    render(<UsageMeter label="Storage" value={4} max={10} format={(n) => `${n} GB`} />)
    const meter = screen.getByRole("meter", { name: "Storage" })
    expect(meter).toHaveAttribute("aria-valuenow", "4")
    expect(meter).toHaveAttribute("aria-valuemax", "10")
    expect(meter).toHaveAttribute("aria-valuetext", "4 GB / 10 GB")
  })

  it("escalates the level past each threshold and says so", () => {
    const { container, rerender } = render(<UsageMeter label="Seats" value={8} max={10} />)
    expect(container.firstElementChild).toHaveAttribute("data-level", "warning")
    rerender(<UsageMeter label="Seats" value={9.5} max={10} />)
    expect(container.firstElementChild).toHaveAttribute("data-level", "danger")
    expect(screen.getByRole("meter").getAttribute("aria-valuetext")).toMatch(/near limit/)
  })

  it("sums segments and lists them in a legend", () => {
    render(
      <UsageMeter
        label="Disk"
        max={100}
        segments={[
          { label: "Media", value: 30 },
          { label: "Docs", value: 12 },
        ]}
      />,
    )
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "42")
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
  })
})
