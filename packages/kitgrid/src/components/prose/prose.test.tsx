import { render, screen } from "@testing-library/react"
import { Prose } from "./prose.js"

describe("Prose", () => {
  it("wraps rendered content without changing its semantics", () => {
    render(
      <Prose as="article" size="lg">
        <h2>Shipping</h2>
        <p>Orders leave within a day.</p>
        <ul>
          <li>Free over $50</li>
        </ul>
      </Prose>,
    )
    const article = screen.getByRole("article")
    expect(article).toHaveClass("kg-prose")
    expect(article).toHaveAttribute("data-size", "lg")
    expect(article).toHaveAttribute("data-measure")
    expect(screen.getByRole("heading", { name: "Shipping" })).toBeInTheDocument()
    expect(screen.getByRole("list")).toBeInTheDocument()
  })

  it("can run full width", () => {
    render(<Prose data-testid="p" measure={false} />)
    expect(screen.getByTestId("p")).not.toHaveAttribute("data-measure")
  })
})
