import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { OrderSummary } from "./order-summary.js"

const lines = [
  {
    id: "a",
    title: "Linen overshirt",
    variantTitle: "Sage / M",
    quantity: 2,
    price: 50,
  },
  { id: "b", title: "Ceramic mug set", quantity: 1, price: 28 },
]

describe("OrderSummary", () => {
  it("lists lines and computes totals with Intl formatting", () => {
    render(
      <OrderSummary
        lines={lines}
        discounts={[{ label: "WELCOME10", amount: 12.8 }]}
        shipping={0}
        tax={9.5}
      />,
    )
    const summary = screen.getByRole("region", { name: "Order summary" })
    expect(summary).toHaveTextContent("Quantity 2")
    expect(summary).toHaveTextContent("$128.00")
    expect(summary).toHaveTextContent("−$12.80")
    expect(summary).toHaveTextContent("Free")
    expect(summary).toHaveTextContent("$124.70")
  })

  it("shows a pending shipping message and respects an explicit total", () => {
    render(
      <OrderSummary
        lines={lines}
        shipping={null}
        total={99}
        currency="EUR"
        locale="de-DE"
      />,
    )
    expect(screen.getByText("Calculated at next step")).toBeInTheDocument()
    expect(screen.getAllByText(/99,00\s€/).length).toBeGreaterThan(0)
  })

  it("toggles the collapsible panel with aria-expanded", async () => {
    const onOpenChange = jest.fn()
    render(
      <OrderSummary lines={lines} collapsible="always" onOpenChange={onOpenChange} />,
    )
    const toggle = screen.getByRole("button", { name: /Show order summary/ })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(toggle).toHaveTextContent("$128.00")
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(toggle).toHaveTextContent("Hide order summary")
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it("renders no toggle when not collapsible", () => {
    render(<OrderSummary lines={lines} collapsible="never" />)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})

describe("OrderSummary media", () => {
  it("marks lines without an image as placeholders", () => {
    const { container } = render(
      <OrderSummary lines={[{ id: "a", title: "Tote", price: 58, quantity: 1 }]} collapsible="never" />,
    )
    expect(container.querySelector(".kg-order-summary__thumb")).toHaveAttribute("data-placeholder")
  })
})
