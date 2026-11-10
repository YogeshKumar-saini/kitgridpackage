import { render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { CheckoutSteps } from "./checkout-steps.js"

const steps = [
  { id: "cart", label: "Cart" },
  { id: "info", label: "Information" },
  { id: "shipping", label: "Shipping", description: "2–4 days" },
  { id: "payment", label: "Payment" },
]

describe("CheckoutSteps", () => {
  it("marks complete, current and upcoming steps", () => {
    render(<CheckoutSteps steps={steps} current="shipping" />)
    const nav = screen.getByRole("navigation", { name: "Checkout progress" })
    const items = within(nav).getAllByRole("listitem")
    expect(items.map((item) => item.dataset.state)).toEqual([
      "complete",
      "complete",
      "current",
      "upcoming",
    ])
    expect(items[2]).toHaveAttribute("aria-current", "step")
    expect(items[0]).toHaveTextContent("Cart, completed")
    expect(nav).toHaveTextContent("Step 3 of 4")
  })

  it("makes only completed steps clickable", async () => {
    const onStepClick = jest.fn()
    render(<CheckoutSteps steps={steps} current="shipping" onStepClick={onStepClick} />)
    expect(screen.getAllByRole("button")).toHaveLength(2)
    await userEvent.click(screen.getByRole("button", { name: /Information/ }))
    expect(onStepClick).toHaveBeenCalledWith("info", 1)
  })

  it("supports vertical layout and custom labels", () => {
    render(
      <CheckoutSteps
        steps={steps}
        current="cart"
        orientation="vertical"
        compact
        labels={{ nav: "Progression", summary: (p, t) => `Étape ${p} sur ${t}` }}
      />,
    )
    const nav = screen.getByRole("navigation", { name: "Progression" })
    expect(nav).toHaveAttribute("data-orientation", "vertical")
    expect(nav).toHaveAttribute("data-compact", "always")
    expect(nav).toHaveTextContent("Étape 1 sur 4")
  })
})
