import { act, render, renderHook, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { CartProvider, useCart } from "../cart/cart.js"
import {
  type QuickViewProduct,
  toCartItem,
  useProductVariant,
} from "./product-model.js"
import { QuickView } from "./quick-view.js"

const product: QuickViewProduct = {
  id: "overshirt",
  title: "Linen overshirt",
  vendor: "Atelier",
  description: "Garment-dyed European linen.",
  price: 89,
  compareAt: 110,
  rating: 4.7,
  reviewCount: 212,
  href: "/products/overshirt",
  images: [
    { src: "/sage.jpg", alt: "Sage overshirt" },
    { src: "/ink.jpg", alt: "Ink overshirt" },
  ],
  options: [
    {
      name: "Color",
      type: "swatch",
      values: [
        { value: "sage", label: "Sage", color: "green" },
        { value: "ink", label: "Ink", color: "navy" },
      ],
    },
    {
      name: "Size",
      values: [
        { value: "S", label: "S" },
        { value: "M", label: "M" },
      ],
    },
  ],
  variants: [
    { id: "sage-s", options: { Color: "sage", Size: "S" }, stock: 0 },
    { id: "sage-m", options: { Color: "sage", Size: "M" }, stock: 3 },
    {
      id: "ink-s",
      options: { Color: "ink", Size: "S" },
      stock: 8,
      image: 1,
      price: 79,
    },
    { id: "ink-m", options: { Color: "ink", Size: "M" }, stock: 0, image: 1 },
  ],
}

describe("useProductVariant", () => {
  it("starts on the first in-stock SKU and follows stock when switching", () => {
    const { result } = renderHook(() => useProductVariant(product))
    expect(result.current.variant?.id).toBe("sage-m")
    expect(result.current.availability.Size).toEqual({ S: false, M: true })
    act(() => result.current.select("Color", "ink"))
    expect(result.current.variant?.id).toBe("ink-s")
    expect(result.current.price).toBe(79)
    expect(result.current.variantTitle).toBe("Ink / S")
  })

  it("maps a SKU to a cart item", () => {
    expect(toCartItem(product, product.variants[2])).toMatchObject({
      productId: "overshirt",
      variantId: "ink-s",
      variantTitle: "Ink / S",
      price: 79,
      maxQuantity: 8,
      image: "/ink.jpg",
    })
  })
})

describe("QuickView", () => {
  it("shows the product and adds the chosen SKU to the cart", async () => {
    let cart: ReturnType<typeof useCart> | undefined
    const Spy = () => {
      cart = useCart()
      return null
    }
    const onAddToCart = jest.fn()
    render(
      <CartProvider>
        <QuickView product={product} open onAddToCart={onAddToCart} />
        <Spy />
      </CartProvider>,
    )
    const dialog = screen.getByRole("dialog", { name: "Linen overshirt" })
    expect(dialog).toHaveAccessibleDescription("Garment-dyed European linen.")
    expect(screen.getByRole("radio", { name: /^S \(/ })).toBeDisabled()
    expect(screen.getByRole("link", { name: /View full details/ })).toHaveAttribute(
      "href",
      "/products/overshirt",
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Increase quantity of Linen overshirt" }),
    )
    await userEvent.click(screen.getByRole("button", { name: "Add to cart" }))
    expect(onAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 2,
        variant: expect.objectContaining({ id: "sage-m" }),
      }),
    )
    expect(cart?.lines[0]).toMatchObject({ variantId: "sage-m", quantity: 2 })
  })

  it("stays closed without a product", () => {
    render(<QuickView product={null} open />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
