import { render, screen } from "@testing-library/react"
import { GradientText } from "./gradient-text.js"

describe("GradientText", () => {
  it("renders readable text in the chosen element, animated by default", () => {
    render(<GradientText as="h1">Design faster</GradientText>)
    const heading = screen.getByRole("heading", { level: 1, name: "Design faster" })
    expect(heading).toHaveAttribute("data-animate")
    expect(heading.style.getPropertyValue("--_angle")).toBe("90deg")
  })

  it("closes custom colours on the first one so the drift has no seam", () => {
    render(
      <GradientText colors={["red", "gold", "blue"]} angle={45} duration={3000}>
        Sale
      </GradientText>,
    )
    const node = screen.getByText("Sale")
    expect(node.style.getPropertyValue("--kg-gradient-colors")).toBe(
      "red, gold, blue, red",
    )
    expect(node.style.getPropertyValue("--_angle")).toBe("45deg")
    expect(node.style.getPropertyValue("--_duration")).toBe("3000ms")
  })

  it("renders a static gradient when animate is off", () => {
    render(<GradientText animate={false}>Still</GradientText>)
    expect(screen.getByText("Still")).not.toHaveAttribute("data-animate")
  })
})
