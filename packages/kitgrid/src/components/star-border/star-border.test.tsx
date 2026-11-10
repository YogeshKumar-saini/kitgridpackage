import { render, screen } from "@testing-library/react"
import { StarBorder } from "./star-border.js"

describe("StarBorder", () => {
  it("renders a type=button by default with hidden light points", () => {
    const { container } = render(<StarBorder>Get started</StarBorder>)
    const button = screen.getByRole("button", { name: "Get started" })
    expect(button).toHaveAttribute("type", "button")
    const stars = container.querySelectorAll(".kg-star-border__star")
    expect(stars).toHaveLength(2)
    for (const star of stars) expect(star).toHaveAttribute("aria-hidden", "true")
  })

  it("can render as a link", () => {
    render(
      <StarBorder as="a" href="/pricing">
        Pricing
      </StarBorder>,
    )
    const link = screen.getByRole("link", { name: "Pricing" })
    expect(link).toHaveAttribute("href", "/pricing")
    expect(link).not.toHaveAttribute("type")
  })
})
