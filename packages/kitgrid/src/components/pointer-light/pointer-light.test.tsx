import { fireEvent, render, screen } from "@testing-library/react"
import { PointerLight } from "./pointer-light.js"

describe("PointerLight", () => {
  it("wraps content and lights while the pointer is over it", () => {
    render(
      <PointerLight data-testid="light" size={200} intensity={0.5} blend="soft-light">
        <p>Revenue</p>
      </PointerLight>,
    )
    const light = screen.getByTestId("light")
    expect(light).toHaveAttribute("data-blend", "soft-light")
    expect(light.style.getPropertyValue("--kg-pointer-light-size")).toBe("200px")
    fireEvent.pointerEnter(light)
    expect(light).toHaveAttribute("data-pointer", "in")
    fireEvent.pointerLeave(light)
    expect(light).not.toHaveAttribute("data-pointer")
  })

  it("lights the child itself with asChild", () => {
    render(
      <PointerLight asChild>
        <section aria-label="Panel">Body</section>
      </PointerLight>,
    )
    expect(screen.getByRole("region", { name: "Panel" })).toHaveClass(
      "kg-pointer-light",
    )
  })
})
