import { render, screen } from "@testing-library/react"
import { GlitchText } from "./glitch-text.js"

describe("GlitchText", () => {
  it("renders plain text with the copies in CSS only", () => {
    render(<GlitchText as="h2">Signal lost</GlitchText>)
    const heading = screen.getByRole("heading", { name: "Signal lost" })
    expect(heading).toHaveAttribute("data-text", "Signal lost")
    expect(heading.children).toHaveLength(0)
  })

  it("exposes trigger and timing to CSS", () => {
    render(
      <GlitchText trigger="hover" speed={1200}>
        Hover
      </GlitchText>,
    )
    const node = screen.getByText("Hover")
    expect(node).toHaveAttribute("data-trigger", "hover")
    expect(node.style.getPropertyValue("--_speed")).toBe("1200ms")
  })
})
