import { render, screen } from "@testing-library/react"
import { PlanBadge } from "./plan-badge.js"

describe("PlanBadge", () => {
  it("defaults its text to the tier and accepts a custom label", () => {
    const { rerender } = render(<PlanBadge tier="enterprise" />)
    expect(screen.getByText("Enterprise")).toHaveAttribute("data-tier", "enterprise")
    rerender(<PlanBadge tier="pro">Pro trial</PlanBadge>)
    expect(screen.getByText("Pro trial")).toHaveAttribute("data-tier", "pro")
  })
})
