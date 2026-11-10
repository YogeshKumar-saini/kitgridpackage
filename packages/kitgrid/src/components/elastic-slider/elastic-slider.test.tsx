import { fireEvent, render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { ElasticSlider } from "./elastic-slider.js"

describe("ElasticSlider", () => {
  it("is a named slider with its range", () => {
    render(<ElasticSlider label="Volume" defaultValue={40} />)
    const slider = screen.getByRole("slider", { name: "Volume" })
    expect(slider).toHaveAttribute("aria-valuenow", "40")
    expect(slider).toHaveAttribute("aria-valuemin", "0")
    expect(slider).toHaveAttribute("aria-valuemax", "100")
  })

  it("follows the slider keyboard map", () => {
    const onValueChange = jest.fn()
    render(<ElasticSlider label="Volume" defaultValue={50} step={5} onValueChange={onValueChange} />)
    const slider = screen.getByRole("slider")
    fireEvent.keyDown(slider, { key: "ArrowRight" })
    expect(slider).toHaveAttribute("aria-valuenow", "55")
    fireEvent.keyDown(slider, { key: "Home" })
    expect(slider).toHaveAttribute("aria-valuenow", "0")
    fireEvent.keyDown(slider, { key: "End" })
    expect(slider).toHaveAttribute("aria-valuenow", "100")
    fireEvent.keyDown(slider, { key: "PageDown" })
    expect(slider).toHaveAttribute("aria-valuenow", "90")
    expect(onValueChange).toHaveBeenLastCalledWith(90)
  })

  it("clamps at the ends", () => {
    render(<ElasticSlider label="Zoom" defaultValue={100} />)
    const slider = screen.getByRole("slider")
    fireEvent.keyDown(slider, { key: "ArrowUp" })
    expect(slider).toHaveAttribute("aria-valuenow", "100")
  })

  it("offers value text and ignores input when disabled", () => {
    render(
      <ElasticSlider
        label="Brightness"
        defaultValue={20}
        disabled
        getValueText={(v) => `${v} percent`}
      />,
    )
    const slider = screen.getByRole("slider")
    expect(slider).toHaveAttribute("aria-valuetext", "20 percent")
    fireEvent.keyDown(slider, { key: "ArrowRight" })
    expect(slider).toHaveAttribute("aria-valuenow", "20")
  })

  it("works under reduced motion", () => {
    render(
      <KitgridProvider reducedMotion="always">
        <ElasticSlider label="Speed" defaultValue={10} />
      </KitgridProvider>,
    )
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" })
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "11")
  })
})
