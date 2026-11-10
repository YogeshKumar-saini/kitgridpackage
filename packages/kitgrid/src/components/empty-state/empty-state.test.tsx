import { render, screen } from "@testing-library/react"
import { EmptyState } from "./empty-state.js"

describe("EmptyState", () => {
  it("renders a heading, description and actions with a decorative icon", () => {
    const { container } = render(
      <EmptyState
        icon={<svg />}
        title="Your cart is empty"
        description="Items you add will show up here."
        actions={<button type="button">Browse products</button>}
      />,
    )
    expect(
      screen.getByRole("heading", { level: 3, name: "Your cart is empty" }),
    ).toBeVisible()
    expect(screen.getByText("Items you add will show up here.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Browse products" })).toBeInTheDocument()
    expect(container.querySelector(".kg-empty-state__icon")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("lets the heading level follow the page outline", () => {
    render(<EmptyState title="No results" titleAs="h2" variant="dashed" />)
    const heading = screen.getByRole("heading", { level: 2, name: "No results" })
    expect(heading.parentElement?.parentElement).toHaveAttribute(
      "data-variant",
      "dashed",
    )
  })
})
