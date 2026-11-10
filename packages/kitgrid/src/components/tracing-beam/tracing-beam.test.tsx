import { render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { TracingBeam } from "./tracing-beam.js"

describe("TracingBeam", () => {
  it("wraps content with a decorative rail", () => {
    const { container } = render(
      <TracingBeam>
        <article>Changelog</article>
      </TracingBeam>,
    )
    expect(screen.getByRole("article")).toHaveTextContent("Changelog")
    expect(container.querySelector(".kg-tracing-beam__rail")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("renders under reduced motion", () => {
    render(
      <KitgridProvider reducedMotion="always">
        <TracingBeam>
          <p>Notes</p>
        </TracingBeam>
      </KitgridProvider>,
    )
    expect(screen.getByText("Notes")).toBeInTheDocument()
  })
})
