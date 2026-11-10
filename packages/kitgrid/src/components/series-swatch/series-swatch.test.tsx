import { render, screen } from "@testing-library/react"
import { SeriesSwatch } from "./series-swatch.js"

describe("SeriesSwatch", () => {
  it("hides the mark and keeps the label readable", () => {
    const { container } = render(
      <SeriesSwatch shape="line" index={9}>
        Returning visitors
      </SeriesSwatch>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(screen.getByText("Returning visitors")).toBeInTheDocument()
    expect(root).toHaveAttribute("data-index", "1")
    expect(root).toHaveAttribute("data-shape", "line")
    expect(root.querySelector(".kg-series-swatch__mark")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("takes a custom color through a private property", () => {
    const { container } = render(<SeriesSwatch color="var(--kg-info)" />)
    const root = container.firstElementChild as HTMLElement
    expect(root).not.toHaveAttribute("data-index")
    expect(root.style.getPropertyValue("--_color")).toBe("var(--kg-info)")
  })
})
