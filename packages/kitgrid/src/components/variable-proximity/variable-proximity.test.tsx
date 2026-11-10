import { render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { VariableProximity } from "./variable-proximity.js"

describe("VariableProximity", () => {
  it("names the element with the full text and hides the pieces", () => {
    const { container } = render(
      <VariableProximity as="p">Move closer</VariableProximity>,
    )
    expect(screen.getByText("Move closer")).toHaveClass("kg-visually-hidden")
    expect(container.querySelectorAll(".kg-variable-proximity__char")).toHaveLength(10)
    expect(
      container.querySelector(".kg-variable-proximity__word")?.parentElement,
    ).toHaveAttribute("aria-hidden", "true")
  })

  it("starts at the resting axes", () => {
    const { container } = render(
      <VariableProximity from={{ wght: 300 }} to={{ wght: 800 }}>
        Rest
      </VariableProximity>,
    )
    expect((container.firstElementChild as HTMLElement).style.fontVariationSettings).toContain(
      "300",
    )
  })

  it("renders static text under reduced motion", () => {
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <VariableProximity>Calm</VariableProximity>
      </KitgridProvider>,
    )
    const char = container.querySelector(".kg-variable-proximity__char") as HTMLElement
    expect(char.style.fontVariationSettings).toBe("")
  })
})
