import { render } from "@testing-library/react"
import { Spacer } from "./spacer.js"

describe("Spacer", () => {
  it("is hidden from assistive tech", () => {
    const { container } = render(<Spacer />)
    const spacer = container.firstElementChild
    expect(spacer).toHaveAttribute("aria-hidden", "true")
    expect(spacer).not.toHaveAttribute("data-fixed")
  })

  it("holds a fixed gap on the chosen axis", () => {
    const { container } = render(<Spacer size={8} axis="inline" />)
    const spacer = container.firstElementChild as HTMLElement
    expect(spacer).toHaveAttribute("data-fixed")
    expect(spacer).toHaveAttribute("data-axis", "inline")
    expect(spacer.style.getPropertyValue("--_size")).toBe("calc(var(--kg-space) * 8)")
  })
})
