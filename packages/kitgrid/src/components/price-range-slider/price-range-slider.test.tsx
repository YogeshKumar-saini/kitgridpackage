import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { PriceRangeSlider } from "./price-range-slider.js"

describe("PriceRangeSlider", () => {
  it("names the group and both thumbs with currency value text", () => {
    render(<PriceRangeSlider min={0} max={300} defaultValue={[40, 180]} />)
    expect(screen.getByRole("group", { name: "Price" })).toBeInTheDocument()
    const [low, high] = screen.getAllByRole("slider")
    expect(low).toHaveAccessibleName("Minimum price")
    expect(low).toHaveAttribute("aria-valuetext", "$40")
    expect(high).toHaveAttribute("aria-valuetext", "$180")
  })

  it("moves with the keyboard and syncs the inputs", async () => {
    const onValueCommit = jest.fn()
    render(
      <PriceRangeSlider
        min={0}
        max={300}
        step={5}
        defaultValue={[40, 180]}
        onValueCommit={onValueCommit}
      />,
    )
    const [low] = screen.getAllByRole("slider")
    low?.focus()
    await userEvent.keyboard("{ArrowRight}")
    expect(onValueCommit).toHaveBeenLastCalledWith([45, 180])
    expect(screen.getByRole("textbox", { name: "Minimum price" })).toHaveValue("45")
  })

  it("validates typed values on blur: rounds, clamps and never crosses", async () => {
    const onValueCommit = jest.fn()
    render(
      <PriceRangeSlider
        min={0}
        max={300}
        step={5}
        defaultValue={[40, 180]}
        onValueCommit={onValueCommit}
      />,
    )
    const min = screen.getByRole("textbox", { name: "Minimum price" })
    await userEvent.clear(min)
    await userEvent.type(min, "222")
    fireEvent.blur(min)
    expect(onValueCommit).toHaveBeenLastCalledWith([180, 180])
    expect(min).toHaveValue("180")

    const max = screen.getByRole("textbox", { name: "Maximum price" })
    await userEvent.clear(max)
    await userEvent.type(max, "1,000{Enter}")
    expect(onValueCommit).toHaveBeenLastCalledWith([180, 300])
  })

  it("reverts invalid input", async () => {
    const onValueCommit = jest.fn()
    render(
      <PriceRangeSlider
        min={0}
        max={300}
        defaultValue={[40, 180]}
        onValueCommit={onValueCommit}
      />,
    )
    const min = screen.getByRole("textbox", { name: "Minimum price" })
    await userEvent.clear(min)
    await userEvent.type(min, "abc")
    fireEvent.blur(min)
    expect(min).toHaveValue("40")
    expect(onValueCommit).not.toHaveBeenCalled()
  })

  it("highlights histogram bars inside the range", () => {
    const { container } = render(
      <PriceRangeSlider min={0} max={100} value={[25, 50]} histogram={[1, 4, 8, 2]} />,
    )
    const bars = container.querySelectorAll(".kg-price-range__bar")
    expect(Array.from(bars).map((bar) => bar.hasAttribute("data-active"))).toEqual([
      false,
      true,
      false,
      false,
    ])
  })
})
