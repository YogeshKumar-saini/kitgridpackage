import { render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { MorphingText } from "./morphing-text.js"

describe("MorphingText", () => {
  it("lists every text once for assistive tech and hides the layers", () => {
    const { container } = render(<MorphingText as="h2" texts={["Craft", "Speed", "Care"]} />)
    expect(screen.getByRole("heading", { name: "Craft, Speed, Care" })).toBeInTheDocument()
    expect(container.querySelector(".kg-morphing-text__stage")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("renders the first text before any frame runs", () => {
    const { container } = render(<MorphingText texts={["First", "Second"]} />)
    expect(container.querySelector(".kg-morphing-text__layer")).toHaveTextContent("First")
  })

  it("holds the first text under reduced motion", () => {
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <MorphingText texts={["Stay", "Go"]} />
      </KitgridProvider>,
    )
    const [a, b] = container.querySelectorAll<HTMLElement>(".kg-morphing-text__layer")
    expect(a).toHaveTextContent("Stay")
    expect(b?.style.opacity).toBe("0")
  })
})
