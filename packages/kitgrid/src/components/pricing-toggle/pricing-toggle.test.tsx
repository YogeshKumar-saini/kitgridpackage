import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { PricingToggle } from "./pricing-toggle.js"

describe("PricingToggle", () => {
  it("is a named radio group with the savings in the yearly name", () => {
    render(<PricingToggle savings="−20%" />)
    expect(screen.getByRole("radiogroup", { name: "Billing period" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Monthly" })).toBeChecked()
    expect(screen.getByRole("radio", { name: /Yearly/ })).toHaveAccessibleName(
      "Yearly−20%",
    )
  })

  it("reports changes and supports controlled values", async () => {
    const onValueChange = jest.fn()
    const { rerender } = render(
      <PricingToggle value="monthly" onValueChange={onValueChange} />,
    )
    await userEvent.click(screen.getByRole("radio", { name: "Yearly" }))
    expect(onValueChange).toHaveBeenCalledWith("yearly")
    rerender(<PricingToggle value="yearly" onValueChange={onValueChange} />)
    expect(screen.getByRole("radio", { name: "Yearly" })).toBeChecked()
  })
})
