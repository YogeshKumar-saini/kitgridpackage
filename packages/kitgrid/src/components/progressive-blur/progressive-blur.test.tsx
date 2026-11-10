import { render } from "@testing-library/react"
import { ProgressiveBlur } from "./progressive-blur.js"

describe("ProgressiveBlur", () => {
  it("is a decorative stack of blur layers", () => {
    const { container } = render(<ProgressiveBlur layers={4} />)
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveAttribute("aria-hidden", "true")
    expect(root).toHaveAttribute("data-side", "bottom")
    expect(root.children).toHaveLength(4)
  })

  it("doubles the blur with every layer toward the edge", () => {
    const { container } = render(<ProgressiveBlur layers={3} strength={8} side="top" />)
    const layers = Array.from(container.querySelectorAll<HTMLElement>(".kg-progressive-blur__layer"))
    expect(layers.map((layer) => layer.style.backdropFilter)).toEqual([
      "blur(2.00px)",
      "blur(4.00px)",
      "blur(8.00px)",
    ])
  })
})
