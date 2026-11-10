import { render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { MiniCart } from "./mini-cart.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

const items = [
  { id: "a", name: "Linen shirt", variant: "Sage / M", price: 68, quantity: 2 },
  { id: "b", name: "Canvas tote", price: 24, quantity: 1 },
]

describe("MiniCart", () => {
  it("names the trigger with the item count", () => {
    render(<MiniCart items={items} />)
    expect(screen.getByRole("button", { name: "Cart, 3 items" })).toBeInTheDocument()
  })

  it("lists lines with totals and the subtotal", async () => {
    const onCheckout = jest.fn()
    render(<MiniCart items={items} onCheckout={onCheckout} cartHref="/cart" />)
    await userEvent.click(screen.getByRole("button", { name: "Cart, 3 items" }))
    const panel = screen.getByRole("dialog", { name: "Your cart" })
    expect(within(panel).getAllByRole("listitem")).toHaveLength(2)
    expect(within(panel).getByText("$136.00")).toBeInTheDocument()
    expect(within(panel).getByText("$160.00")).toBeInTheDocument()
    expect(within(panel).getByRole("link", { name: "View cart" })).toHaveAttribute("href", "/cart")
    await userEvent.click(within(panel).getByRole("button", { name: "Checkout" }))
    expect(onCheckout).toHaveBeenCalled()
  })

  it("removes lines and shows an empty state", async () => {
    const onRemove = jest.fn()
    const { rerender } = render(<MiniCart items={items} onRemove={onRemove} defaultOpen />)
    await userEvent.click(screen.getByRole("button", { name: "Remove Canvas tote" }))
    expect(onRemove).toHaveBeenCalledWith("b")
    rerender(<MiniCart items={[]} onRemove={onRemove} defaultOpen />)
    expect(screen.getByText("Your cart is empty.")).toBeInTheDocument()
  })
})
