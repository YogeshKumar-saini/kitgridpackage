import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Knob } from "./knob.js"

describe("Knob", () => {
  it("is a slider with its range and spoken value", () => {
    render(<Knob aria-label="Gain" min={-12} max={12} defaultValue={3} formatValue={(v) => `${v} dB`} />)
    const knob = screen.getByRole("slider", { name: "Gain" })
    expect(knob).toHaveAttribute("aria-valuenow", "3")
    expect(knob).toHaveAttribute("aria-valuetext", "3 dB")
  })

  it("turns with the keyboard and commits on key up", async () => {
    const onValueCommit = jest.fn()
    render(<Knob aria-label="Volume" defaultValue={50} onValueCommit={onValueCommit} />)
    const knob = screen.getByRole("slider")
    knob.focus()
    await userEvent.keyboard("{ArrowUp}{ArrowUp}")
    expect(knob).toHaveAttribute("aria-valuenow", "52")
    expect(onValueCommit).toHaveBeenLastCalledWith(52)
    await userEvent.keyboard("{PageDown}")
    expect(knob).toHaveAttribute("aria-valuenow", "42")
    await userEvent.keyboard("{End}")
    expect(knob).toHaveAttribute("aria-valuenow", "100")
    await userEvent.keyboard("{ArrowUp}")
    expect(knob).toHaveAttribute("aria-valuenow", "100")
  })

  it("turns with a vertical drag", () => {
    const onValueChange = jest.fn()
    const onValueCommit = jest.fn()
    render(
      <Knob
        aria-label="Volume"
        defaultValue={50}
        dragRange={100}
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
      />,
    )
    const knob = screen.getByRole("slider")
    knob.setPointerCapture = () => {}
    fireEvent.pointerDown(knob, { button: 0, clientY: 200, pointerId: 1 })
    fireEvent.pointerMove(knob, { clientY: 180, pointerId: 1 })
    expect(onValueChange).toHaveBeenLastCalledWith(70)
    fireEvent.pointerUp(knob, { pointerId: 1 })
    expect(onValueCommit).toHaveBeenCalledWith(70)
  })

  it("ignores input while disabled", async () => {
    render(<Knob aria-label="Volume" defaultValue={10} disabled />)
    const knob = screen.getByRole("slider")
    expect(knob).toHaveAttribute("aria-disabled", "true")
    knob.focus()
    await userEvent.keyboard("{ArrowUp}")
    expect(knob).toHaveAttribute("aria-valuenow", "10")
  })
})
