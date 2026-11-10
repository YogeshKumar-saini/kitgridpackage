import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { TimePicker } from "./time-picker.js"

const spin = (name: string) => screen.getByRole("spinbutton", { name })

describe("TimePicker", () => {
  it("is a labelled group of spinbuttons", () => {
    render(<TimePicker aria-label="Pickup" hourCycle={24} defaultValue="09:30" />)
    expect(screen.getByRole("group", { name: "Pickup" })).toBeInTheDocument()
    expect(spin("Hours")).toHaveAttribute("aria-valuenow", "9")
    expect(spin("Minutes")).toHaveAttribute("aria-valuetext", "30")
    expect(screen.queryByRole("spinbutton", { name: "AM/PM" })).not.toBeInTheDocument()
  })

  it("types digits and advances to the next segment", async () => {
    const onValueChange = jest.fn()
    render(<TimePicker aria-label="Pickup" hourCycle={24} onValueChange={onValueChange} />)
    spin("Hours").focus()
    await userEvent.keyboard("14")
    expect(spin("Minutes")).toHaveFocus()
    await userEvent.keyboard("5")
    expect(onValueChange).toHaveBeenLastCalledWith("14:05")
    await userEvent.keyboard("9")
    expect(onValueChange).toHaveBeenLastCalledWith("14:59")
  })

  it("steps minutes with the arrow keys and wraps", async () => {
    const onValueChange = jest.fn()
    render(
      <TimePicker
        aria-label="Pickup"
        hourCycle={24}
        minuteStep={15}
        defaultValue="10:50"
        onValueChange={onValueChange}
      />,
    )
    spin("Minutes").focus()
    await userEvent.keyboard("{ArrowUp}")
    expect(onValueChange).toHaveBeenLastCalledWith("10:00")
    await userEvent.keyboard("{ArrowDown}")
    expect(onValueChange).toHaveBeenLastCalledWith("10:45")
  })

  it("maps the 12-hour clock and AM/PM to 24-hour values", async () => {
    const onValueChange = jest.fn()
    render(
      <TimePicker
        aria-label="Pickup"
        hourCycle={12}
        defaultValue="08:15"
        onValueChange={onValueChange}
      />,
    )
    expect(spin("AM/PM")).toHaveTextContent("AM")
    spin("AM/PM").focus()
    await userEvent.keyboard("p")
    expect(onValueChange).toHaveBeenLastCalledWith("20:15")
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}")
    expect(spin("Hours")).toHaveFocus()
    await userEvent.keyboard("{Backspace}")
    expect(onValueChange).toHaveBeenLastCalledWith(null)
  })
})
