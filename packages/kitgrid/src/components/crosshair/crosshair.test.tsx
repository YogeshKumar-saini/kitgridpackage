import { render, screen } from "@testing-library/react"
import { Crosshair } from "./crosshair.js"

describe("Crosshair", () => {
  it("keeps the content readable and the hairlines hidden", () => {
    const { container } = render(
      <Crosshair>
        <p>Canvas</p>
      </Crosshair>,
    )
    expect(screen.getByText("Canvas")).toBeInTheDocument()
    expect(container.querySelector(".kg-crosshair__layer")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("adds a coordinate readout and can hide the cursor", () => {
    const { container } = render(<Crosshair coordinates hideCursor />)
    expect(container.querySelector(".kg-crosshair__readout")).not.toBeNull()
    expect(container.firstElementChild).toHaveAttribute("data-hide-cursor")
  })
})
