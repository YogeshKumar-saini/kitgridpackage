import { render, screen } from "@testing-library/react"
import { Heading } from "./heading.js"

describe("Heading", () => {
  it("renders the level's element with a matching size by default", () => {
    render(<Heading level={1}>Orders</Heading>)
    const heading = screen.getByRole("heading", { level: 1, name: "Orders" })
    expect(heading).toHaveAttribute("data-size", "3xl")
    expect(heading).toHaveAttribute("data-balance")
  })

  it("keeps the outline level when the visual size changes", () => {
    render(
      <Heading level={3} size="4xl" tone="accent" weight="bold">
        Big
      </Heading>,
    )
    const heading = screen.getByRole("heading", { level: 3 })
    expect(heading).toHaveAttribute("data-size", "4xl")
    expect(heading).toHaveAttribute("data-tone", "accent")
    expect(heading).toHaveAttribute("data-weight", "bold")
  })
})
