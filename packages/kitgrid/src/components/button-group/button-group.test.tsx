import { render, screen } from "@testing-library/react"
import { ButtonGroup } from "./button-group.js"

describe("ButtonGroup", () => {
  it("is a named group of buttons", () => {
    render(
      <ButtonGroup aria-label="Alignment">
        <button type="button">Left</button>
        <button type="button">Center</button>
      </ButtonGroup>,
    )
    const group = screen.getByRole("group", { name: "Alignment" })
    expect(group).toHaveAttribute("data-attached")
    expect(group).toHaveAttribute("data-orientation", "horizontal")
    expect(screen.getAllByRole("button")).toHaveLength(2)
  })

  it("can be detached and vertical", () => {
    render(<ButtonGroup aria-label="Stack" attached={false} orientation="vertical" />)
    const group = screen.getByRole("group", { name: "Stack" })
    expect(group).not.toHaveAttribute("data-attached")
    expect(group).toHaveAttribute("data-orientation", "vertical")
  })
})
