import { render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { TextPressure } from "./text-pressure.js"

describe("TextPressure", () => {
  it("reads the text once and hides the split characters", () => {
    const { container } = render(<TextPressure as="h2">Pressure</TextPressure>)
    expect(screen.getByRole("heading", { name: "Pressure" })).toBeInTheDocument()
    expect(container.querySelector(".kg-text-pressure__text")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
    expect(container.querySelectorAll(".kg-text-pressure__char")).toHaveLength(8)
  })

  it("passes the weight range to CSS", () => {
    const { container } = render(
      <TextPressure minWeight={200} maxWeight={800}>
        Hi
      </TextPressure>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.getPropertyValue("--_min")).toBe("200")
    expect(root.style.getPropertyValue("--_max")).toBe("800")
  })

  it("stays static under reduced motion", () => {
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <TextPressure>Still</TextPressure>
      </KitgridProvider>,
    )
    const char = container.querySelector(".kg-text-pressure__char") as HTMLElement
    expect(char.style.getPropertyValue("--_p")).toBe("")
  })
})
