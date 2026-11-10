import { render, screen } from "@testing-library/react"
import { BillingUsage } from "./billing-usage.js"

describe("BillingUsage", () => {
  it("renders a named region with a meter per item and days left", () => {
    render(
      <BillingUsage
        period="Oct 1 - Oct 31"
        elapsedDays={24}
        totalDays={31}
        total="$184.20"
        items={[
          { id: "seats", label: "Seats", used: 9, limit: 10 },
          { id: "queries", label: "Queries", used: 41200, limit: 50000 },
        ]}
      />,
    )
    expect(screen.getByRole("region", { name: "Usage" })).toBeInTheDocument()
    expect(screen.getByRole("meter", { name: "Seats" })).toHaveAttribute("aria-valuenow", "9")
    expect(screen.getAllByRole("meter")).toHaveLength(2)
    expect(screen.getByText("7 days left")).toBeInTheDocument()
    expect(screen.getByText("$184.20")).toBeInTheDocument()
  })
})
