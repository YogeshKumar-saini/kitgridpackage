import { render, screen } from "@testing-library/react"
import { createRef } from "react"
import { renderToString } from "react-dom/server"
import { GlassPanel } from "./glass-panel.js"

describe("GlassPanel", () => {
  it("renders its content as an ordinary surface", () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <GlassPanel ref={ref} className="extra">
        <p>Payout scheduled for Friday</p>
      </GlassPanel>,
    )
    expect(ref.current).toHaveClass("kg-glass-panel", "extra")
    expect(ref.current).toHaveAttribute("data-radius", "xl")
    expect(screen.getByText("Payout scheduled for Friday")).toBeInTheDocument()
  })

  it("clamps blur and tint and only ships grain when asked", () => {
    const { container, rerender } = render(<GlassPanel blur={-4} tint={3} />)
    const root = container.firstElementChild as HTMLElement
    expect(root.style.getPropertyValue("--kg-glass-panel-blur")).toBe("0px")
    expect(root.style.getPropertyValue("--kg-glass-panel-tint")).toBe("100%")
    expect(root.style.getPropertyValue("--kg-glass-panel-grain")).toBe("")
    rerender(<GlassPanel grain radius="2xl" />)
    expect(root).toHaveAttribute("data-grain")
    expect(root).toHaveAttribute("data-radius", "2xl")
    expect(root.style.getPropertyValue("--kg-glass-panel-grain")).toContain("data:image/svg+xml")
  })

  it("renders identical markup on every server pass", () => {
    expect(renderToString(<GlassPanel grain />)).toBe(renderToString(<GlassPanel grain />))
  })
})
