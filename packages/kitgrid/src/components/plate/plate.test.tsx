import { render } from "@testing-library/react"
import { createRef } from "react"
import { Plate } from "./plate.js"

describe("Plate", () => {
  it("renders a framed area with its variant, padding and marks", () => {
    const ref = createRef<HTMLDivElement>()
    const { getByText } = render(
      <Plate ref={ref} variant="grid" padding="lg" marks>
        Drop a CSV here
      </Plate>,
    )
    const plate = getByText("Drop a CSV here")
    expect(ref.current).toBe(plate)
    expect(plate).toHaveAttribute("data-variant", "grid")
    expect(plate).toHaveAttribute("data-padding", "lg")
    expect(plate).toHaveAttribute("data-marks")
  })
})
