import { render, screen } from "@testing-library/react"
import { QuotaBar, quotaBarLevel } from "./quota-bar.js"

describe("QuotaBar", () => {
  it("exposes a named meter with readable value text", () => {
    render(<QuotaBar label="Seats" used={8} limit={10} />)
    const meter = screen.getByRole("meter", { name: "Seats" })
    expect(meter).toHaveAttribute("aria-valuenow", "8")
    expect(meter).toHaveAttribute("aria-valuemax", "10")
    expect(meter).toHaveAttribute("aria-valuetext", "8 of 10")
    expect(meter.closest(".kg-quota-bar")).toHaveAttribute("data-level", "warning")
  })

  it("caps the value and announces the limit once exceeded", () => {
    render(<QuotaBar label="Storage" used={12} limit={10} format={(v) => `${v} GB`} />)
    const meter = screen.getByRole("meter", { name: "Storage" })
    expect(meter).toHaveAttribute("aria-valuenow", "10")
    expect(meter).toHaveAttribute("aria-valuetext", "12 GB of 10 GB, limit reached")
  })

  it("classifies levels", () => {
    expect(quotaBarLevel(1, 10)).toBe("ok")
    expect(quotaBarLevel(9, 10)).toBe("warning")
    expect(quotaBarLevel(10, 10)).toBe("exceeded")
  })
})
