import { render, screen } from "@testing-library/react"
import { OrbitingCircles } from "./orbiting-circles.js"

describe("OrbitingCircles", () => {
  it("places each satellite on its own slot", () => {
    const { container } = render(
      <OrbitingCircles center={<span>Hub</span>}>
        <span>Mail</span>
        <span>Chat</span>
        <span>Docs</span>
      </OrbitingCircles>,
    )
    const slots = container.querySelectorAll<HTMLElement>(".kg-orbiting-circles__slot")
    expect(slots).toHaveLength(3)
    expect(slots[2]?.style.getPropertyValue("--_i")).toBe("2")
    expect(screen.getByText("Hub")).toBeInTheDocument()
  })

  it("hides the decorative track and can drop it", () => {
    const { container, rerender } = render(
      <OrbitingCircles>
        <span>A</span>
      </OrbitingCircles>,
    )
    expect(container.querySelector(".kg-orbiting-circles__path")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
    rerender(
      <OrbitingCircles path={false} reverse>
        <span>A</span>
      </OrbitingCircles>,
    )
    expect(container.querySelector(".kg-orbiting-circles__path")).toBeNull()
    expect(container.firstElementChild).toHaveAttribute("data-reverse")
  })
})
