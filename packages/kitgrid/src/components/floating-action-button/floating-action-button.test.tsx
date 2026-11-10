import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { FloatingActionButton } from "./floating-action-button.js"

describe("FloatingActionButton", () => {
  it("names an icon-only button through label", () => {
    render(<FloatingActionButton icon={<svg />} label="Compose" />)
    const button = screen.getByRole("button", { name: "Compose" })
    expect(button).toHaveAttribute("data-placement", "bottom-end")
  })

  it("shows the label as text when extended", () => {
    render(<FloatingActionButton icon={<svg />} label="New task" extended />)
    const button = screen.getByRole("button", { name: "New task" })
    expect(button).not.toHaveAttribute("aria-label")
    expect(button).toHaveTextContent("New task")
  })

  it("fires onClick", async () => {
    const onClick = jest.fn()
    render(<FloatingActionButton icon={<svg />} label="Add" onClick={onClick} />)
    await userEvent.click(screen.getByRole("button", { name: "Add" }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
