import { render, screen } from "@testing-library/react"
import { Center } from "./center.js"

describe("Center", () => {
  it("defaults to a 60ch measure", () => {
    render(<Center data-testid="center" />)
    expect(screen.getByTestId("center").style.getPropertyValue("--_max")).toBe("60ch")
  })

  it("exposes intrinsic and text centring", () => {
    render(<Center data-testid="center" max="32rem" gutters={4} intrinsic text />)
    const center = screen.getByTestId("center")
    expect(center).toHaveAttribute("data-intrinsic")
    expect(center).toHaveAttribute("data-text")
    expect(center.style.getPropertyValue("--_gutters")).toBe("calc(var(--kg-space) * 4)")
  })
})
