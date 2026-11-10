import { render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { StrokeText } from "./stroke-text.js"

describe("StrokeText", () => {
  it("keeps one copy of the text in the DOM", () => {
    render(<StrokeText as="h2">Outline</StrokeText>)
    const heading = screen.getByRole("heading", { name: "Outline" })
    expect(heading).toHaveAttribute("data-text", "Outline")
    expect(heading.children).toHaveLength(0)
  })

  it("waits to fill until in view", () => {
    render(<StrokeText trigger="view">Later</StrokeText>)
    expect(screen.getByText("Later")).not.toHaveAttribute("data-filled")
  })

  it("shows the filled state under reduced motion", () => {
    render(
      <KitgridProvider reducedMotion="always">
        <StrokeText trigger="scroll">Filled</StrokeText>
      </KitgridProvider>,
    )
    expect(screen.getByText("Filled")).toHaveAttribute("data-filled")
  })
})
