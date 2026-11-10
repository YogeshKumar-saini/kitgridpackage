import { render, screen } from "@testing-library/react"
import { OrderTracker } from "./order-tracker.js"

const steps = [
  { id: "placed", label: "Ordered", date: "Oct 20" },
  { id: "shipped", label: "Shipped", date: "Oct 21" },
  { id: "out", label: "Out for delivery" },
  { id: "delivered", label: "Delivered" },
]

describe("OrderTracker", () => {
  it("marks the current step and states each step in words", () => {
    render(<OrderTracker steps={steps} current="shipped" />)
    expect(screen.getByRole("navigation", { name: "Order progress" })).toBeInTheDocument()
    const items = screen.getAllByRole("listitem")
    expect(items[0]).toHaveTextContent("Complete: Ordered")
    expect(items[1]).toHaveAttribute("aria-current", "step")
    expect(items[1]).toHaveTextContent("Current: Shipped")
    expect(items[3]).toHaveTextContent("Upcoming: Delivered")
  })

  it("exposes progress and exception state for styling", () => {
    const { container } = render(
      <OrderTracker steps={steps} current="delivered" status="exception" />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveAttribute("data-status", "exception")
    expect(root.style.getPropertyValue("--_progress")).toBe("1")
  })
})
