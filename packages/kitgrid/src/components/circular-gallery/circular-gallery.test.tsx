import { fireEvent, render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { CircularGallery } from "./circular-gallery.js"

const panels = ["Linen", "Wool", "Silk", "Denim"]

describe("CircularGallery", () => {
  it("is a labelled carousel of slides", () => {
    render(
      <CircularGallery label="Fabrics">
        {panels.map((p) => (
          <span key={p}>{p}</span>
        ))}
      </CircularGallery>,
    )
    expect(screen.getByRole("region", { name: "Fabrics" })).toHaveAttribute(
      "aria-roledescription",
      "carousel",
    )
    expect(screen.getAllByRole("group")).toHaveLength(4)
    expect(screen.getByRole("group", { name: "1 of 4" })).toHaveTextContent("Linen")
  })

  it("steps one panel per arrow key under reduced motion", () => {
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <CircularGallery label="Fabrics">
          {panels.map((p) => (
            <span key={p}>{p}</span>
          ))}
        </CircularGallery>
      </KitgridProvider>,
    )
    fireEvent.keyDown(screen.getByRole("region"), { key: "ArrowRight" })
    const ring = container.querySelector(".kg-circular-gallery__ring") as HTMLElement
    expect(ring.style.getPropertyValue("--_angle")).toBe("-90.00deg")
  })
})
