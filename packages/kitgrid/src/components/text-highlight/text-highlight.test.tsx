import { render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { TextHighlight } from "./text-highlight.js"

describe("TextHighlight", () => {
  it("wraps the text in a <mark> that keeps it readable", () => {
    render(
      <p>
        Prices drop <TextHighlight>every Friday</TextHighlight>.
      </p>,
    )
    const mark = screen.getByText("every Friday")
    expect(mark.tagName).toBe("MARK")
    expect(mark).toHaveAttribute("data-variant", "marker")
    expect(mark).toHaveAttribute("data-state", "hidden")
  })

  it("draws immediately with trigger=mount and under reduced motion", () => {
    const { rerender } = render(<TextHighlight trigger="mount">Now</TextHighlight>)
    expect(screen.getByText("Now")).toHaveAttribute("data-state", "visible")
    rerender(
      <KitgridProvider reducedMotion="always">
        <TextHighlight>Now</TextHighlight>
      </KitgridProvider>,
    )
    expect(screen.getByText("Now")).toHaveAttribute("data-state", "visible")
  })

  it("draws a decorative loop for the circle variant", () => {
    const { container } = render(
      <TextHighlight variant="circle" color="tomato" as="strong">
        free
      </TextHighlight>,
    )
    const root = screen.getByText("free")
    expect(root.tagName).toBe("STRONG")
    expect(root.style.getPropertyValue("--kg-highlight-color")).toBe("tomato")
    const svg = container.querySelector("svg")
    expect(svg).toHaveAttribute("aria-hidden", "true")
    expect(svg?.querySelector("path")).toHaveAttribute("pathLength", "1")
  })

  it("passes timing through as custom properties", () => {
    render(
      <TextHighlight variant="underline" duration={400} delay={150}>
        soon
      </TextHighlight>,
    )
    const node = screen.getByText("soon")
    expect(node.style.getPropertyValue("--_duration")).toBe("400ms")
    expect(node.style.getPropertyValue("--_delay")).toBe("150ms")
  })
})
