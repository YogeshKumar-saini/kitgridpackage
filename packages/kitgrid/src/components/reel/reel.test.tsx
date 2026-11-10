import { render, screen } from "@testing-library/react"
import { Reel } from "./reel.js"

describe("Reel", () => {
  it("is a named, focusable scroll region", () => {
    render(
      <Reel label="Recent items" itemWidth="12rem">
        <div>One</div>
      </Reel>,
    )
    const reel = screen.getByRole("region", { name: "Recent items" })
    expect(reel).toHaveAttribute("tabindex", "0")
    expect(reel).toHaveAttribute("data-snap")
    expect(reel.style.getPropertyValue("--_item")).toBe("12rem")
  })

  it("can turn snapping off and hide the bar", () => {
    render(<Reel label="Strip" snap={false} hideScrollbar />)
    const reel = screen.getByRole("region", { name: "Strip" })
    expect(reel).not.toHaveAttribute("data-snap")
    expect(reel).toHaveAttribute("data-hide-scrollbar")
  })
})
