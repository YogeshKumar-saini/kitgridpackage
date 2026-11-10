import { render } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { MagnetLines } from "./magnet-lines.js"

describe("MagnetLines", () => {
  it("renders a hidden grid of rows by columns", () => {
    const { container } = render(<MagnetLines rows={3} columns={4} />)
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveAttribute("aria-hidden", "true")
    expect(root.children).toHaveLength(12)
  })

  it("starts every line at the base angle", () => {
    const { container } = render(<MagnetLines baseAngle={30} />)
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue("--_r")).toBe(
      "30deg",
    )
  })

  it("renders under reduced motion", () => {
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <MagnetLines rows={2} columns={2} />
      </KitgridProvider>,
    )
    expect(container.querySelectorAll(".kg-magnet-lines__line")).toHaveLength(4)
  })
})
