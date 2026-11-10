import { render, screen } from "@testing-library/react"
import { Spinner } from "./spinner.js"

describe("Spinner", () => {
  it("is a status region named by a visually hidden label", () => {
    render(<Spinner />)
    const status = screen.getByRole("status")
    expect(status).toHaveTextContent("Loading")
    expect(screen.getByText("Loading")).toHaveClass("kg-visually-hidden")
  })

  it("renders three hidden dots for the dots variant with a custom label", () => {
    const { container } = render(
      <Spinner variant="dots" label="Saving draft" tone="accent" />,
    )
    expect(screen.getByRole("status")).toHaveTextContent("Saving draft")
    const dots = container.querySelector(".kg-spinner__dots")
    expect(dots).toHaveAttribute("aria-hidden", "true")
    expect(dots?.children).toHaveLength(3)
  })
})
