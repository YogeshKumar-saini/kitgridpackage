import { render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { StickyReveal } from "./sticky-reveal.js"

describe("StickyReveal", () => {
  it("keeps the media and overlay in the accessibility tree", () => {
    render(
      <StickyReveal overlay={<h2>Autumn line</h2>}>
        <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="Coats on a rail" />
      </StickyReveal>,
    )
    expect(screen.getByRole("img", { name: "Coats on a rail" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Autumn line" })).toBeInTheDocument()
  })

  it("sets the scroll length from viewport heights", () => {
    const { container } = render(
      <StickyReveal length={3}>
        <span>Media</span>
      </StickyReveal>,
    )
    expect(
      (container.firstElementChild as HTMLElement).style.getPropertyValue("--_steps"),
    ).toBe("4")
  })

  it("renders open under reduced motion", () => {
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <StickyReveal>
          <span>Media</span>
        </StickyReveal>
      </KitgridProvider>,
    )
    expect(container.querySelector(".kg-sticky-reveal")).toHaveAttribute("data-reduced")
  })
})
