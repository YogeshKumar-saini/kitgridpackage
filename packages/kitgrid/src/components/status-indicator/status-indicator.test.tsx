import { render, screen } from "@testing-library/react"
import { StatusIndicator } from "./status-indicator.js"

describe("StatusIndicator", () => {
  it("writes the status out instead of relying on colour", () => {
    const { container } = render(<StatusIndicator status="degraded" />)
    expect(screen.getByText("Degraded")).toBeInTheDocument()
    expect(container.firstChild).toHaveAttribute("data-status", "degraded")
    expect(container.querySelector("svg")?.closest("[aria-hidden]")).not.toBeNull()
  })

  it("accepts a custom label and can keep it for screen readers only", () => {
    render(<StatusIndicator status="outage" label="API down" hideLabel />)
    expect(screen.getByText("API down")).toHaveClass("kg-visually-hidden")
  })
})
