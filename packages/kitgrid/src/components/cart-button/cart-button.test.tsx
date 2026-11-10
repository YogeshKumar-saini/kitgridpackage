import { act, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { CartProvider, useCart } from "../cart/cart.js"
import { CartButton } from "./cart-button.js"

describe("CartButton", () => {
  it("names itself with the count and marks itself as the fly-to-cart target", () => {
    render(<CartButton count={3} />)
    const button = screen.getByRole("button", { name: "Cart, 3 items" })
    expect(button).toHaveAttribute("data-cart-target")
  })

  it("caps the visible badge and supports custom labels", () => {
    render(<CartButton count={120} labels={{ label: (count) => `Panier, ${count}` }} />)
    expect(screen.getByRole("button", { name: "Panier, 120" })).toHaveTextContent("99+")
  })

  it("reads the provider count and opens the cart", async () => {
    let cart: ReturnType<typeof useCart> | undefined
    const Spy = () => {
      cart = useCart()
      return null
    }
    render(
      <CartProvider>
        <CartButton />
        <Spy />
      </CartProvider>,
    )
    act(() => cart?.addItem({ productId: "a", title: "Tote", price: 30 }))
    const button = screen.getByRole("button", { name: "Cart, 1 item" })
    expect(button).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(button)
    expect(cart?.isOpen).toBe(true)
    expect(button).toHaveAttribute("aria-expanded", "true")
  })
})
