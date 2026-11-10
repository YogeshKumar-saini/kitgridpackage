import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ProductCard } from "./product-card.js"

const base = {
  title: "Linen overshirt",
  href: "/products/linen-overshirt",
  vendor: "Atelier",
  image: { src: "/a.jpg", alt: "Overshirt in sage" },
  hoverImage: { src: "/b.jpg", alt: "Back view" },
  price: 89,
  compareAt: 110,
}

describe("ProductCard", () => {
  it("is one link named by the title, with a discount badge and sale price", () => {
    render(<ProductCard {...base} />)
    const link = screen.getByRole("link", { name: "Linen overshirt" })
    expect(link).toHaveAttribute("href", "/products/linen-overshirt")
    expect(screen.getByRole("heading", { level: 3 })).toContainElement(link)
    expect(screen.getByText("−19%")).toBeInTheDocument()
    expect(screen.getByText(/Sale price/)).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Overshirt in sage" })).toHaveAttribute(
      "loading",
      "lazy",
    )
  })

  it("keeps the hover image out of the accessibility tree", () => {
    const { container } = render(<ProductCard {...base} />)
    expect(container.querySelector("img[data-hover]")).toHaveAttribute("alt", "")
  })

  it("renders separate wishlist, quick-add and quick-view buttons", async () => {
    const onWishlistChange = jest.fn()
    const onQuickAdd = jest.fn()
    const onQuickView = jest.fn()
    render(
      <ProductCard
        {...base}
        onWishlistChange={onWishlistChange}
        onQuickAdd={onQuickAdd}
        onQuickView={onQuickView}
      />,
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Add Linen overshirt to wishlist" }),
    )
    expect(onWishlistChange).toHaveBeenCalledWith(true)
    await userEvent.click(
      screen.getByRole("button", { name: "Quick add: Linen overshirt" }),
    )
    expect(onQuickAdd).toHaveBeenCalled()
    await userEvent.click(
      screen.getByRole("button", { name: "Quick view: Linen overshirt" }),
    )
    expect(onQuickView).toHaveBeenCalled()
  })

  it("marks sold-out products and disables quick add", () => {
    render(<ProductCard {...base} soldOut onQuickAdd={() => {}} />)
    expect(screen.getAllByText("Sold out").length).toBeGreaterThan(0)
    expect(screen.queryByText("−19%")).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Quick add: Linen overshirt" }),
    ).toBeDisabled()
  })

  it("previews swatches with an overflow count", () => {
    render(
      <ProductCard
        {...base}
        maxSwatches={2}
        swatches={[
          { label: "Sage", color: "green" },
          { label: "Sand", color: "beige" },
          { label: "Ink", color: "navy" },
        ]}
      />,
    )
    const list = screen.getByRole("list", { name: "3 colors" })
    expect(list).toHaveTextContent("+1")
    expect(list).toHaveTextContent("and 1 more")
  })

  it("renders a busy skeleton while loading", () => {
    render(<ProductCard {...base} loading />)
    expect(screen.getByRole("article")).toHaveAttribute("aria-busy", "true")
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })
})

describe("ProductCard media placeholder", () => {
  it("renders a neutral placeholder when there is no image", () => {
    const { container, rerender } = render(<ProductCard title="Linen shirt" href="#" price={68} />)
    const media = container.querySelector(".kg-product-card__media")
    expect(media).toHaveAttribute("data-placeholder")
    expect(media?.querySelector("img")).toBeNull()
    rerender(<ProductCard title="Linen shirt" href="#" price={68} image={{ src: "/a.jpg", alt: "Front" }} />)
    expect(container.querySelector(".kg-product-card__media")).not.toHaveAttribute("data-placeholder")
  })
})
