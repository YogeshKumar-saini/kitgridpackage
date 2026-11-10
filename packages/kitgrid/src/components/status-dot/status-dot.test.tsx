import { render, screen } from "@testing-library/react"
import { StatusDot } from "./status-dot.js"

describe("StatusDot", () => {
  it("names a standalone dot as an image", () => {
    render(<StatusDot status="busy" label="In a meeting" />)
    const dot = screen.getByRole("img", { name: "In a meeting" })
    expect(dot).toHaveAttribute("data-status", "busy")
  })

  it("falls back to the status word when unlabelled", () => {
    render(<StatusDot status="away" />)
    expect(screen.getByRole("img", { name: "away" })).toBeInTheDocument()
  })

  it("reads visible text instead of an image role", () => {
    render(<StatusDot status="success">Operational</StatusDot>)
    expect(screen.queryByRole("img")).toBeNull()
    expect(screen.getByText("Operational")).toBeInTheDocument()
  })

  it("marks pulse in a data attribute", () => {
    const { container } = render(<StatusDot pulse>Live</StatusDot>)
    expect(container.firstElementChild).toHaveAttribute("data-pulse", "true")
  })
})
