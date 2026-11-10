import { render, screen } from "@testing-library/react"
import { StatePanel } from "./state-panel.js"

describe("StatePanel", () => {
  it("announces an error with its title, description and action", () => {
    render(
      <StatePanel
        state="error"
        title="Couldn't load orders"
        description="Request 7f3a2c timed out."
        action={<button type="button">Try again</button>}
      />,
    )
    const status = screen.getByRole("status")
    expect(status).toHaveAttribute("data-state", "error")
    expect(status).toHaveTextContent("Couldn't load orders")
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
  })

  it("falls back to a title per state and marks loading as busy", () => {
    const { rerender } = render(<StatePanel state="no-access" />)
    expect(screen.getByText("You don't have access")).toBeInTheDocument()
    rerender(<StatePanel state="loading" />)
    const status = screen.getByRole("status")
    expect(status).toHaveAttribute("aria-busy", "true")
    expect(status.querySelector(".kg-state-panel__icon")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("renders the title at the requested level", () => {
    render(<StatePanel title="No members yet" titleAs="h3" />)
    expect(
      screen.getByRole("heading", { level: 3, name: "No members yet" }),
    ).toBeInTheDocument()
  })
})
