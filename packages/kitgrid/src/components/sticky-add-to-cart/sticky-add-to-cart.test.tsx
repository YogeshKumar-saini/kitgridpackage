import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { StickyAddToCart } from "./sticky-add-to-cart.js"

describe("StickyAddToCart", () => {
  it("is a named region with the product and an add button", async () => {
    const onAdd = jest.fn()
    render(<StickyAddToCart name="Linen shirt" variant="Sage / M" price={68} onAdd={onAdd} />)
    const region = screen.getByRole("region", { name: "Quick add to cart" })
    expect(region).toHaveAttribute("data-state", "open")
    await userEvent.click(screen.getByRole("button", { name: "Add to cart" }))
    expect(onAdd).toHaveBeenCalled()
  })

  it("hides from assistive technology and the tab order while closed", () => {
    const { container } = render(<StickyAddToCart name="Linen shirt" price={68} visible={false} />)
    const bar = container.firstElementChild as HTMLElement
    expect(bar).toHaveAttribute("data-state", "closed")
    expect(bar).toHaveAttribute("aria-hidden", "true")
    expect(bar).toHaveAttribute("inert")
  })
})

describe("StickyAddToCart media", () => {
  it("keeps the image slot as a placeholder when no image is given, so the bar height is stable", () => {
    const { container } = render(<StickyAddToCart position="inline" visible name="Linen shirt" price={68} />)
    const slot = container.querySelector(".kg-sticky-atc__image")
    expect(slot).toHaveAttribute("data-placeholder")
    expect(slot?.querySelector("img")).toBeNull()
  })

  it("shows the image when one is given", () => {
    const { container } = render(
      <StickyAddToCart position="inline" visible name="Linen shirt" price={68} image="/a.jpg" />,
    )
    const slot = container.querySelector(".kg-sticky-atc__image")
    expect(slot).not.toHaveAttribute("data-placeholder")
    expect(slot?.querySelector("img")).toHaveAttribute("src", "/a.jpg")
  })
})
