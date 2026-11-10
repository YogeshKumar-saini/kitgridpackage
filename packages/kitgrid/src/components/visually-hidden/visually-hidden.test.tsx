import { render, screen } from "@testing-library/react"
import { VisuallyHidden } from "./visually-hidden.js"

describe("VisuallyHidden", () => {
  it("keeps text in the accessible name", () => {
    render(
      <button type="button">
        <svg aria-hidden="true" />
        <VisuallyHidden>Close dialog</VisuallyHidden>
      </button>,
    )
    expect(screen.getByRole("button", { name: "Close dialog" })).toBeInTheDocument()
    expect(screen.getByText("Close dialog")).toHaveClass("kg-visually-hidden")
  })

  it("marks focusable content and merges onto a child", () => {
    render(
      <VisuallyHidden asChild focusable>
        <a href="#main">Skip to content</a>
      </VisuallyHidden>,
    )
    const link = screen.getByRole("link", { name: "Skip to content" })
    expect(link).toHaveClass("kg-visually-hidden")
    expect(link).toHaveAttribute("data-focusable")
  })
})
