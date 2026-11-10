import { render, screen } from "@testing-library/react"
import { Readout } from "./readout.js"

describe("Readout", () => {
  it("pairs the label and value and adds a delta and caption", () => {
    render(
      <Readout
        label="Net revenue"
        value="$184,920"
        delta={8.2}
        caption="vs previous 30 days"
      />,
    )
    expect(screen.getByRole("term")).toHaveTextContent("Net revenue")
    const [value, delta, caption] = screen.getAllByRole("definition")
    expect(value).toHaveTextContent("$184,920")
    expect(delta).toHaveTextContent("up 8.2%")
    expect(caption).toHaveTextContent("vs previous 30 days")
  })

  it("tucks the delta beside the value in the compact layout", () => {
    const { container } = render(
      <Readout
        label="Refund rate"
        value="2.1"
        unit="%"
        delta={-0.4}
        deltaProps={{ invert: true }}
        layout="compact"
      />,
    )
    const value = container.querySelector(".kg-readout__value") as HTMLElement
    expect(value).toHaveTextContent("2.1%down 0.4%")
    expect(value.querySelector(".kg-delta")).toHaveAttribute("data-tone", "positive")
    expect(container.querySelector(".kg-readout__delta")).toBeNull()
  })
})
