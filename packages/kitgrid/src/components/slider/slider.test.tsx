import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import { Field } from "../field/field.js"
import { Slider } from "./slider.js"

// jsdom has no layout; give the control a 200px-wide box so pointer maths can run.
const mockRect = (container: HTMLElement) => {
  const control = container.querySelector(".kg-slider__control") as HTMLElement
  control.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      right: 200,
      bottom: 20,
      width: 200,
      height: 20,
      x: 0,
      y: 0,
    }) as DOMRect
}

describe("Slider", () => {
  it("exposes a slider with value, bounds and an accessible name", () => {
    render(<Slider aria-label="Volume" defaultValue={[30]} />)
    const thumb = screen.getByRole("slider", { name: "Volume" })
    expect(thumb).toHaveAttribute("aria-valuenow", "30")
    expect(thumb).toHaveAttribute("aria-valuemin", "0")
    expect(thumb).toHaveAttribute("aria-valuemax", "100")
    expect(thumb).toHaveAttribute("aria-orientation", "horizontal")
  })

  it("follows the APG keyboard map and commits each key press", async () => {
    const onValueChange = jest.fn()
    const onValueCommit = jest.fn()
    render(
      <Slider
        aria-label="Volume"
        defaultValue={[50]}
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
      />,
    )
    const thumb = screen.getByRole("slider")
    thumb.focus()
    await userEvent.keyboard("{ArrowRight}")
    expect(thumb).toHaveAttribute("aria-valuenow", "51")
    await userEvent.keyboard("{ArrowDown}{ArrowDown}")
    expect(thumb).toHaveAttribute("aria-valuenow", "49")
    await userEvent.keyboard("{PageUp}")
    expect(thumb).toHaveAttribute("aria-valuenow", "59")
    await userEvent.keyboard("{PageDown}{PageDown}")
    expect(thumb).toHaveAttribute("aria-valuenow", "39")
    await userEvent.keyboard("{End}")
    expect(thumb).toHaveAttribute("aria-valuenow", "100")
    await userEvent.keyboard("{Home}")
    expect(thumb).toHaveAttribute("aria-valuenow", "0")
    expect(onValueCommit).toHaveBeenLastCalledWith([0])
    expect(onValueChange).toHaveBeenCalledTimes(8)
  })

  it("respects step, min and max", async () => {
    render(
      <Slider aria-label="Size" min={10} max={20} step={2.5} defaultValue={[10]} />,
    )
    const thumb = screen.getByRole("slider")
    thumb.focus()
    await userEvent.keyboard("{ArrowUp}")
    expect(thumb).toHaveAttribute("aria-valuenow", "12.5")
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}")
    expect(thumb).toHaveAttribute("aria-valuenow", "10")
  })

  it("keeps range thumbs apart and narrows each thumb's bounds", async () => {
    render(
      <Slider
        aria-label="Price"
        defaultValue={[20, 30]}
        minStepsBetweenThumbs={5}
        thumbLabels={["Min price", "Max price"]}
      />,
    )
    expect(screen.getByRole("group", { name: "Price" })).toBeInTheDocument()
    const low = screen.getByRole("slider", { name: "Min price" })
    const high = screen.getByRole("slider", { name: "Max price" })
    expect(low).toHaveAttribute("aria-valuemax", "25")
    expect(high).toHaveAttribute("aria-valuemin", "25")
    low.focus()
    await userEvent.keyboard("{End}")
    expect(low).toHaveAttribute("aria-valuenow", "25")
    await userEvent.keyboard("{ArrowRight}")
    expect(low).toHaveAttribute("aria-valuenow", "25")
  })

  it("names range thumbs Minimum and Maximum by default", () => {
    render(<Slider aria-label="Price" defaultValue={[10, 90]} />)
    expect(screen.getByRole("slider", { name: "Minimum" })).toBeInTheDocument()
    expect(screen.getByRole("slider", { name: "Maximum" })).toBeInTheDocument()
  })

  it("formats aria-valuetext and the value bubble", () => {
    render(
      <Slider
        aria-label="Budget"
        defaultValue={[40]}
        formatValue={(value) => `$${value}`}
      />,
    )
    const thumb = screen.getByRole("slider")
    expect(thumb).toHaveAttribute("aria-valuetext", "$40")
    expect(thumb).toHaveTextContent("$40")
  })

  it("jumps the nearest thumb to a track press and commits on release", () => {
    const onValueCommit = jest.fn()
    const { container } = render(
      <Slider
        aria-label="Price"
        defaultValue={[20, 80]}
        onValueCommit={onValueCommit}
      />,
    )
    mockRect(container)
    const root = container.firstElementChild as HTMLElement
    fireEvent.pointerDown(root, { button: 0, clientX: 140, pointerId: 1 })
    const [low, high] = screen.getAllByRole("slider")
    expect(high).toHaveAttribute("aria-valuenow", "70")
    expect(low).toHaveAttribute("aria-valuenow", "20")
    expect(high).toHaveFocus()
    expect(root).toHaveAttribute("data-dragging")
    fireEvent.pointerMove(root, { clientX: 20, pointerId: 1 })
    // The high thumb stops at the low one instead of crossing it.
    expect(high).toHaveAttribute("aria-valuenow", "20")
    fireEvent.pointerUp(root, { pointerId: 1 })
    expect(root).not.toHaveAttribute("data-dragging")
    expect(onValueCommit).toHaveBeenCalledTimes(1)
    expect(onValueCommit).toHaveBeenCalledWith([20, 20])
  })

  it("is driven by a controlled value", async () => {
    const Controlled = () => {
      const [value, setValue] = useState([10])
      return (
        <>
          <Slider aria-label="Zoom" value={value} onValueChange={setValue} />
          <output>{value[0]}</output>
        </>
      )
    }
    render(<Controlled />)
    screen.getByRole("slider").focus()
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByRole("status")).toHaveTextContent("11")
  })

  it("ignores input while disabled and leaves the tab order", async () => {
    const onValueChange = jest.fn()
    render(<Slider aria-label="Zoom" disabled onValueChange={onValueChange} />)
    const thumb = screen.getByRole("slider")
    expect(thumb).toHaveAttribute("aria-disabled", "true")
    expect(thumb).not.toHaveAttribute("tabindex")
    fireEvent.keyDown(thumb, { key: "ArrowRight" })
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it("is labelled by a Field and submits through hidden inputs", () => {
    const { container } = render(
      <Field label="Rating floor" description="Hide products below this.">
        <Slider name="floor" defaultValue={[3]} max={5} />
      </Field>,
    )
    const thumb = screen.getByRole("slider", { name: "Rating floor" })
    expect(thumb).toHaveAccessibleDescription("Hide products below this.")
    expect(container.querySelector('input[type="hidden"][name="floor"]')).toHaveValue(
      "3",
    )
  })
})
