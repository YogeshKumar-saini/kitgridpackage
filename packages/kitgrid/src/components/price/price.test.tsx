import { render, screen } from "@testing-library/react"
import { Price } from "./price.js"

describe("Price", () => {
  it("announces sale and regular prices in words", () => {
    render(<Price amount={49.5} compareAt={79} />)
    expect(screen.getByText("Sale price $49.50")).toBeInTheDocument()
    expect(screen.getByText("Regular price")).toBeInTheDocument()
    expect(screen.getByText("−37%")).toBeInTheDocument()
  })

  it("hides the discount when compareAt is not higher than amount", () => {
    const { container } = render(<Price amount={20} compareAt={20} />)
    expect(container.querySelector("s")).toBeNull()
    expect(container.firstElementChild).not.toHaveAttribute("data-on-sale")
  })

  it("formats per currency and locale", () => {
    const { container } = render(<Price amount={1499} currency="INR" locale="en-IN" />)
    expect(container.querySelector(".kg-visually-hidden")).toHaveTextContent(
      "₹1,499.00",
    )
  })
})
