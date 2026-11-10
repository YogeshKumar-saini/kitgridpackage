import { render, screen } from "@testing-library/react"
import { Stack } from "./stack.js"

describe("Stack", () => {
  it("defaults to a vertical column on the spacing scale", () => {
    render(<Stack data-testid="stack" />)
    const stack = screen.getByTestId("stack")
    expect(stack).toHaveAttribute("data-direction", "vertical")
    expect(stack.style.getPropertyValue("--_gap")).toBe("calc(var(--kg-space) * 3)")
  })

  it("exposes direction, wrap, alignment and dividers", () => {
    render(
      <Stack
        data-testid="stack"
        direction="horizontal"
        wrap
        dividers
        gap="1rem"
        align="center"
        justify="between"
      />,
    )
    const stack = screen.getByTestId("stack")
    expect(stack).toHaveAttribute("data-direction", "horizontal")
    expect(stack).toHaveAttribute("data-wrap")
    expect(stack).toHaveAttribute("data-dividers")
    expect(stack.style.getPropertyValue("--_gap")).toBe("1rem")
    expect(stack.style.getPropertyValue("--_justify")).toBe("space-between")
    expect(stack.style.getPropertyValue("--_align")).toBe("center")
  })

  it("renders a list when asked", () => {
    render(
      <Stack as="ul">
        <li>One</li>
      </Stack>,
    )
    expect(screen.getByRole("list")).toHaveClass("kg-stack")
  })
})
