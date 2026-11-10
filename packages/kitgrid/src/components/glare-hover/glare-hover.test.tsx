import { render, screen } from "@testing-library/react"
import { GlareHover } from "./glare-hover.js"

describe("GlareHover", () => {
  it("wraps content without adding nodes", () => {
    render(
      <GlareHover>
        <a href="#plan">Upgrade plan</a>
      </GlareHover>,
    )
    const link = screen.getByRole("link", { name: "Upgrade plan" })
    expect(link.parentElement).toHaveClass("kg-glare-hover")
    expect(link.parentElement?.children).toHaveLength(1)
  })

  it("passes the sweep settings to CSS", () => {
    const { container } = render(<GlareHover angle={30} duration={500} reverse />)
    const root = container.firstElementChild as HTMLElement
    expect(root.style.getPropertyValue("--_angle")).toBe("30deg")
    expect(root.style.getPropertyValue("--_duration")).toBe("500ms")
    expect(root).toHaveAttribute("data-reverse")
  })
})
