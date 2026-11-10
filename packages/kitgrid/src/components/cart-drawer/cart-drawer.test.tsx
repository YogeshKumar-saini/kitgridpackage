import { act, render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { type CartLine, CartProvider, useCart } from "../cart/cart.js"
import { toastStore } from "../toast/toast-store.js"
import { CartDrawer } from "./cart-drawer.js"

const lines: CartLine[] = [
  {
    id: "shirt",
    productId: "shirt",
    title: "Linen shirt",
    variantTitle: "Sage / M",
    price: 68,
    compareAt: 85,
    quantity: 1,
  },
  { id: "mug", productId: "mug", title: "Mug set", price: 24, quantity: 2 },
]

let cart: ReturnType<typeof useCart> | undefined
const Spy = () => {
  cart = useCart()
  return null
}

const renderCart = (props: Parameters<typeof CartDrawer>[0] = {}) =>
  render(
    <CartProvider initialLines={lines} freeShippingThreshold={150}>
      <CartDrawer {...props} />
      <Spy />
    </CartProvider>,
  )

describe("CartDrawer", () => {
  afterEach(() => {
    for (const record of toastStore.getSnapshot()) toastStore.remove(record.id)
  })

  it("opens from the provider with title, count, lines and totals", () => {
    renderCart()
    act(() => cart?.open())
    const drawer = screen.getByRole("dialog", { name: /Your cart/ })
    expect(drawer).toHaveTextContent("3 items")
    expect(within(drawer).getAllByRole("listitem")).toHaveLength(2)
    expect(within(drawer).getByRole("progressbar")).toBeInTheDocument()
    expect(drawer).toHaveTextContent("Subtotal")
    expect(drawer).toHaveTextContent("You save")
    expect(within(drawer).getByRole("button", { name: "Checkout" })).toBeInTheDocument()
  })

  it("updates quantities through the stepper", async () => {
    renderCart()
    act(() => cart?.open())
    await userEvent.click(
      screen.getByRole("button", { name: "Increase quantity of Linen shirt" }),
    )
    expect(cart?.lines[0]?.quantity).toBe(2)
  })

  it("removes a line and offers undo in a toast", async () => {
    renderCart()
    act(() => cart?.open())
    await userEvent.click(screen.getByRole("button", { name: "Remove Mug set" }))
    expect(cart?.lines.map((line) => line.id)).toEqual(["shirt"])
    const record = toastStore.getSnapshot()[0]
    expect(record?.title).toBe("Removed Mug set")
    act(() => record?.action?.onClick({} as never))
    expect(cart?.lines.map((line) => line.id)).toEqual(["shirt", "mug"])
  })

  it("shows the empty state and closes from its call to action", async () => {
    const onContinueShopping = jest.fn()
    render(
      <CartProvider>
        <CartDrawer onContinueShopping={onContinueShopping} />
        <Spy />
      </CartProvider>,
    )
    act(() => cart?.open())
    expect(screen.getByText("Your cart is empty")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Continue shopping" }))
    expect(onContinueShopping).toHaveBeenCalled()
    expect(cart?.isOpen).toBe(false)
  })

  it("works controlled without a provider", async () => {
    const onCheckout = jest.fn()
    const onQuantityChange = jest.fn()
    render(
      <CartDrawer
        open
        lines={lines}
        currency="EUR"
        locale="de-DE"
        onCheckout={onCheckout}
        onQuantityChange={onQuantityChange}
      />,
    )
    const drawer = screen.getByRole("dialog")
    expect(drawer).toHaveTextContent("€")
    await userEvent.click(
      screen.getByRole("button", { name: "Decrease quantity of Mug set" }),
    )
    expect(onQuantityChange).toHaveBeenCalledWith("mug", 1)
    await userEvent.click(screen.getByRole("button", { name: "Checkout" }))
    expect(onCheckout).toHaveBeenCalledWith(lines)
  })
})
