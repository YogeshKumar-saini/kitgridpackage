import { render, screen } from "@testing-library/react"
import { Bleed } from "./bleed.js"

describe("Bleed", () => {
  it("records how far to pull past the parent", () => {
    render(<Bleed data-testid="b" inline={6} block="1rem" />)
    const bleed = screen.getByTestId("b")
    expect(bleed.style.getPropertyValue("--_inline")).toBe("calc(var(--kg-space) * 6)")
    expect(bleed.style.getPropertyValue("--_block")).toBe("1rem")
  })

  it("marks a full viewport breakout", () => {
    render(<Bleed data-testid="b" full />)
    expect(screen.getByTestId("b")).toHaveAttribute("data-full")
  })
})
