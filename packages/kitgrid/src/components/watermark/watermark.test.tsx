import { render, screen } from "@testing-library/react"
import { Watermark } from "./watermark.js"

describe("Watermark", () => {
  it("renders children and a hidden, inert mark layer", () => {
    const { container } = render(
      <Watermark content="Confidential">
        <p>Q3 board memo</p>
      </Watermark>,
    )
    expect(screen.getByText("Q3 board memo")).toBeInTheDocument()
    const layer = container.querySelector(".kg-watermark__layer") as HTMLElement
    expect(layer).toHaveAttribute("aria-hidden", "true")
    expect(layer.style.getPropertyValue("--_mask")).toContain("data:image/svg+xml")
  })

  it("escapes markup in the mark text", () => {
    const { container } = render(<Watermark content={["<b>", "Rhea & Co"]} />)
    const mask = (container.querySelector(".kg-watermark__layer") as HTMLElement).style
      .getPropertyValue("--_mask")
    const decoded = decodeURIComponent(mask)
    expect(decoded).not.toContain("<b>")
    expect(decoded).toContain("&#60;b&#62;")
  })

  it("omits the layer for empty content", () => {
    const { container } = render(<Watermark content="" />)
    expect(container.querySelector(".kg-watermark__layer")).toBeNull()
  })
})
