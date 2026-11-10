import { render, screen } from "@testing-library/react"
import { LoyaltyMeter } from "./loyalty-meter.js"

const tiers = [
  { name: "Bronze", threshold: 0 },
  { name: "Silver", threshold: 1000 },
  { name: "Gold", threshold: 2500 },
]

describe("LoyaltyMeter", () => {
  it("exposes a meter with the tier and gap to the next one", () => {
    render(<LoyaltyMeter points={1250} tiers={tiers} locale="en-US" />)
    const meter = screen.getByRole("meter", { name: "Silver" })
    expect(meter).toHaveAttribute("aria-valuenow", "1250")
    expect(meter).toHaveAttribute("aria-valuemax", "2500")
    expect(meter).toHaveAttribute(
      "aria-valuetext",
      "1,250 pts, Silver. 1,250 pts to Gold",
    )
  })

  it("reports the top tier once reached, in the ring variant too", () => {
    render(<LoyaltyMeter points={3100} tiers={tiers} variant="ring" locale="en-US" />)
    const meter = screen.getByRole("meter", { name: "Gold" })
    expect(meter).toHaveAttribute("aria-valuenow", "2500")
    expect(meter.getAttribute("aria-valuetext")).toContain("Top tier: Gold")
  })
})
