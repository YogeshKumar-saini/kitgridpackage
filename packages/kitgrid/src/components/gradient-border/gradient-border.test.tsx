import { render, screen } from "@testing-library/react"
import { createRef } from "react"
import { readStylesheet } from "../../../test/backdrop-kit.js"
import { GradientBorder } from "./gradient-border.js"

describe("GradientBorder", () => {
  it("is a plain surface: content stays in the accessibility tree", () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <GradientBorder ref={ref} className="extra" role="region" aria-label="Plan">
        <h3>Team plan</h3>
      </GradientBorder>,
    )
    const region = screen.getByRole("region", { name: "Plan" })
    expect(ref.current).toBe(region)
    expect(region).toHaveClass("kg-gradient-border", "extra")
    expect(region).not.toHaveAttribute("aria-hidden")
    expect(screen.getByRole("heading", { name: "Team plan" })).toBeInTheDocument()
  })

  it("maps props to custom properties and data attributes", () => {
    const { container } = render(
      <GradientBorder colors={["red"]} width={0} duration={3} animated={false} glow />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.getPropertyValue("--kg-gradient-border-color-1")).toBe("red")
    expect(root.style.getPropertyValue("--kg-gradient-border-width")).toBe("0.5px")
    expect(root.style.getPropertyValue("--kg-gradient-border-duration")).toBe("3s")
    expect(root).not.toHaveAttribute("data-animated")
    expect(root).toHaveAttribute("data-glow")
  })

  it("stops turning under both reduced-motion signals", async () => {
    const css = await readStylesheet("gradient-border")
    expect(css).toContain("prefers-reduced-motion: reduce")
    expect(css).toContain('[data-kg-motion="reduce"] .kg-gradient-border[data-animated]')
  })
})
