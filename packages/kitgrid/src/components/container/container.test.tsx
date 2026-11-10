import { render, screen } from "@testing-library/react"
import { Container } from "./container.js"

describe("Container", () => {
  it("defaults to the large size", () => {
    render(<Container data-testid="c" />)
    expect(screen.getByTestId("c")).toHaveAttribute("data-size", "lg")
  })

  it("takes a size, a gutter and an element", () => {
    render(<Container as="main" size="prose" gutter={6} />)
    const main = screen.getByRole("main")
    expect(main).toHaveAttribute("data-size", "prose")
    expect(main.style.getPropertyValue("--_gutter")).toBe("calc(var(--kg-space) * 6)")
  })
})
