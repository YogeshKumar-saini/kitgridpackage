import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { type PricingTablePlan, PricingTable } from "./pricing-table.js"

const plans: PricingTablePlan[] = [
  { id: "starter", name: "Starter", monthly: 0, yearly: 0 },
  { id: "pro", name: "Pro", monthly: 24, yearly: 19, highlighted: true, badge: "Popular" },
  { id: "team", name: "Team", monthly: 60, yearly: 48, cta: "Contact sales" },
]

describe("PricingTable", () => {
  it("shows the best yearly saving on the toggle", () => {
    render(<PricingTable plans={plans} />)
    expect(screen.getByRole("radio", { name: /Yearly/ })).toHaveAccessibleName(
      "Yearly−21%",
    )
    expect(screen.getAllByRole("article")).toHaveLength(3)
  })

  it("switches prices and adds the yearly total", async () => {
    const onBillingChange = jest.fn()
    render(<PricingTable plans={plans} onBillingChange={onBillingChange} />)
    expect(screen.queryByText("Billed $228 yearly")).toBeNull()
    await userEvent.click(screen.getByRole("radio", { name: /Yearly/ }))
    expect(onBillingChange).toHaveBeenCalledWith("yearly")
    expect(screen.getByText("Billed $228 yearly")).toBeInTheDocument()
  })

  it("reports the chosen plan and billing period", async () => {
    const onSelect = jest.fn()
    render(<PricingTable plans={plans} defaultBilling="yearly" onSelect={onSelect} />)
    await userEvent.click(screen.getByRole("button", { name: "Contact sales" }))
    expect(onSelect).toHaveBeenCalledWith("team", "yearly")
  })
})
