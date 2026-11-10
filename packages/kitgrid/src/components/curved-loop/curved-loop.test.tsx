import { render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { CurvedLoop } from "./curved-loop.js"

describe("CurvedLoop", () => {
  it("reads the phrase once and hides the ribbon", () => {
    const { container } = render(<CurvedLoop>Made to move</CurvedLoop>)
    expect(screen.getByText("Made to move")).toHaveClass("kg-visually-hidden")
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
  })

  it("points the text at its own path", () => {
    const { container } = render(<CurvedLoop curve={0}>Line</CurvedLoop>)
    const textPath = container.querySelector("textPath") as SVGTextPathElement
    const id = textPath.getAttribute("href")?.slice(1) ?? ""
    expect(container.querySelector(`path[id="${id}"]`)).not.toBeNull()
  })

  it("is not draggable under reduced motion", () => {
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <CurvedLoop>Still</CurvedLoop>
      </KitgridProvider>,
    )
    expect(container.querySelector(".kg-curved-loop")).not.toHaveAttribute("data-draggable")
  })
})
