import { render, screen } from "@testing-library/react"
import { InputGroup, InputGroupAddon } from "./input-group.js"

describe("InputGroup", () => {
  it("renders its children with size and state attributes", () => {
    render(
      <InputGroup data-testid="group" size="sm" invalid disabled>
        <InputGroupAddon kind="text">https://</InputGroupAddon>
        <input aria-label="Domain" />
      </InputGroup>,
    )
    const group = screen.getByTestId("group")
    expect(group).toHaveAttribute("data-size", "sm")
    expect(group).toHaveAttribute("data-invalid")
    expect(group).toHaveAttribute("data-disabled")
    expect(screen.getByRole("textbox", { name: "Domain" })).toBeInTheDocument()
    expect(screen.getByText("https://")).not.toHaveAttribute("aria-hidden")
  })

  it("hides icon addons from assistive tech", () => {
    render(
      <InputGroup>
        <InputGroupAddon data-testid="icon">*</InputGroupAddon>
      </InputGroup>,
    )
    expect(screen.getByTestId("icon")).toHaveAttribute("aria-hidden", "true")
  })
})
