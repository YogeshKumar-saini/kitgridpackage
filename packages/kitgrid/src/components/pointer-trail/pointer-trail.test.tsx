import { fireEvent, render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { PointerTrail } from "./pointer-trail.js"

describe("PointerTrail", () => {
  it("renders content with a hidden canvas", () => {
    const { container } = render(
      <PointerTrail>
        <p>Draw here</p>
      </PointerTrail>,
    )
    expect(screen.getByText("Draw here")).toBeInTheDocument()
    expect(container.querySelector("canvas")).toHaveAttribute("aria-hidden", "true")
    fireEvent.pointerMove(container.firstElementChild as Element, { clientX: 4, clientY: 4 })
  })

  it("can paint behind the content", () => {
    const { container } = render(<PointerTrail behind />)
    expect(container.firstElementChild).toHaveAttribute("data-behind")
  })

  it("renders under reduced motion", () => {
    render(
      <KitgridProvider reducedMotion="always">
        <PointerTrail>
          <span>Still</span>
        </PointerTrail>
      </KitgridProvider>,
    )
    expect(screen.getByText("Still")).toBeInTheDocument()
  })
})
