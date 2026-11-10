import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { NumberField, parseLocaleNumber } from "./number-field.js"

describe("parseLocaleNumber", () => {
  it("reads group and decimal separators per locale", () => {
    expect(parseLocaleNumber("1,234.5", "en-US")).toBe(1234.5)
    expect(parseLocaleNumber("1.234,5", "de-DE")).toBe(1234.5)
    expect(parseLocaleNumber("-12", "en-US")).toBe(-12)
    expect(parseLocaleNumber("45%", "en-US", { style: "percent" })).toBe(0.45)
    expect(parseLocaleNumber("", "en-US")).toBeNull()
  })
})

describe("NumberField", () => {
  it("is a spinbutton with its bounds", () => {
    render(<NumberField aria-label="Guests" min={1} max={8} defaultValue={2} />)
    const input = screen.getByRole("spinbutton", { name: "Guests" })
    expect(input).toHaveAttribute("aria-valuenow", "2")
    expect(input).toHaveAttribute("aria-valuemin", "1")
    expect(input).toHaveAttribute("aria-valuemax", "8")
  })

  it("steps with the arrow keys, Shift for large steps, and clamps", async () => {
    const onValueChange = jest.fn()
    render(
      <NumberField aria-label="Guests" min={0} max={30} defaultValue={2} onValueChange={onValueChange} />,
    )
    screen.getByRole("spinbutton").focus()
    await userEvent.keyboard("{ArrowUp}")
    expect(onValueChange).toHaveBeenLastCalledWith(3)
    await userEvent.keyboard("{Shift>}{ArrowUp}{ArrowUp}{ArrowUp}{/Shift}")
    expect(onValueChange).toHaveBeenLastCalledWith(30)
    await userEvent.keyboard("{Home}")
    expect(onValueChange).toHaveBeenLastCalledWith(0)
  })

  it("formats on blur in the locale", async () => {
    const onValueChange = jest.fn()
    render(<NumberField aria-label="Amount" locale="de-DE" onValueChange={onValueChange} stepper="none" />)
    const input = screen.getByRole("spinbutton")
    await userEvent.type(input, "12345,5")
    fireEvent.blur(input)
    expect(onValueChange).toHaveBeenLastCalledWith(12345.5)
    expect(input).toHaveValue("12.345,5")
  })

  it("steps with the buttons and disables them at the bounds", async () => {
    render(<NumberField aria-label="Seats" min={1} max={2} defaultValue={1} />)
    const minus = screen.getByRole("button", { name: "Decrease" })
    const plus = screen.getByRole("button", { name: "Increase" })
    expect(minus).toBeDisabled()
    await userEvent.click(plus)
    expect(screen.getByRole("spinbutton")).toHaveAttribute("aria-valuenow", "2")
    expect(plus).toBeDisabled()
  })
})
