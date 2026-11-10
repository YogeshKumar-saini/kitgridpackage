import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { AccentPicker, type AccentPickerOption } from "./accent-picker.js"

const options: AccentPickerOption[] = [
  { value: "orange", label: "Signal orange", color: "oklch(0.72 0.185 50)" },
  { value: "teal", label: "Teal", color: "oklch(0.7 0.12 190)" },
  { value: "green", label: "Green", color: "oklch(0.68 0.15 150)" },
]

describe("AccentPicker", () => {
  it("is a named radio group that selects with click and arrows", async () => {
    const onValueChange = jest.fn()
    render(<AccentPicker options={options} onValueChange={onValueChange} />)
    expect(screen.getByRole("radiogroup", { name: "Accent color" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Signal orange" })).toBeChecked()
    await userEvent.click(screen.getByRole("radio", { name: "Teal" }))
    expect(onValueChange).toHaveBeenLastCalledWith("teal")
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByRole("radio", { name: "Green" })).toBeChecked()
  })

  it("accepts a custom color", () => {
    const onValueChange = jest.fn()
    render(<AccentPicker options={options} allowCustom onValueChange={onValueChange} />)
    const custom = screen.getByLabelText("Custom color")
    fireEvent.input(custom, { target: { value: "#1f8a70" } })
    expect(onValueChange).toHaveBeenLastCalledWith("#1f8a70")
    expect(screen.getByRole("radio", { name: "Signal orange" })).not.toBeChecked()
    expect(custom.closest("label")).toHaveAttribute("data-checked")
  })
})
