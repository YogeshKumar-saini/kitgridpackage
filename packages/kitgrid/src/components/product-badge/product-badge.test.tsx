import { render, screen } from "@testing-library/react"
import { ProductBadge, ProductBadgeGroup } from "./product-badge.js"

describe("ProductBadge", () => {
  it("defaults its text from the kind", () => {
    render(<ProductBadge kind="sold-out" />)
    const badge = screen.getByText("Sold out")
    expect(badge).toHaveAttribute("data-kind", "sold-out")
    expect(badge).toHaveAttribute("data-shape", "pill")
  })

  it("accepts custom text and a decorative icon", () => {
    render(
      <ProductBadge kind="sale" shape="flag" icon={<svg data-testid="icon" />}>
        −30%
      </ProductBadge>,
    )
    expect(screen.getByText("−30%")).toHaveAttribute("data-shape", "flag")
    expect(screen.getByTestId("icon").parentElement).toHaveAttribute("aria-hidden", "true")
  })

  it("pins a group to a corner", () => {
    render(
      <ProductBadgeGroup placement="top-end" data-testid="group">
        <ProductBadge kind="new" />
      </ProductBadgeGroup>,
    )
    expect(screen.getByTestId("group")).toHaveAttribute("data-placement", "top-end")
  })
})
