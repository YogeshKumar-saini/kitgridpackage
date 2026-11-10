import { render, screen, within } from "@testing-library/react"
import { PlanSummary } from "./plan-summary.js"

describe("PlanSummary", () => {
  it("is a region named by its title with tier, price, features and actions", () => {
    render(
      <PlanSummary
        title="Current plan"
        tier="team"
        price="$96"
        cadence="per month"
        renewal="Renews Nov 1"
        features={["12 seats", "SSO"]}
        actions={<button type="button">Change plan</button>}
      />,
    )
    const region = screen.getByRole("region", { name: "Current plan" })
    expect(within(region).getByText("Team")).toHaveAttribute("data-tier", "team")
    expect(within(region).getByText("Renews Nov 1")).toBeInTheDocument()
    expect(within(region).getAllByRole("listitem")).toHaveLength(2)
    expect(within(region).getByRole("button", { name: "Change plan" })).toBeInTheDocument()
  })
})
