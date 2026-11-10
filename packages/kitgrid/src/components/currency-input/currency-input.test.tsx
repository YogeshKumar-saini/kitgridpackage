import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { CurrencyInput } from "./currency-input.js"

describe("CurrencyInput", () => {
  it("shows the symbol outside the text and the code when asked", () => {
    render(<CurrencyInput aria-label="Price" locale="en-US" currency="EUR" showCode defaultValue={1200} />)
    expect(screen.getByRole("spinbutton", { name: "Price" })).toHaveValue("1,200.00")
    expect(screen.getByText("€")).toBeInTheDocument()
    expect(screen.getByText("EUR")).toBeInTheDocument()
  })

  it("rounds to the currency's minor units", async () => {
    const onValueChange = jest.fn()
    render(<CurrencyInput aria-label="Price" locale="en-US" onValueChange={onValueChange} />)
    const input = screen.getByRole("spinbutton")
    await userEvent.type(input, "19.999")
    fireEvent.blur(input)
    expect(onValueChange).toHaveBeenLastCalledWith(20)
    expect(input).toHaveValue("20.00")
  })

  it("uses whole units for currencies without cents", () => {
    render(<CurrencyInput aria-label="Price" locale="en-US" currency="JPY" defaultValue={4500} />)
    expect(screen.getByRole("spinbutton")).toHaveValue("4,500")
  })

  it("never goes below zero by default", async () => {
    const onValueChange = jest.fn()
    render(<CurrencyInput aria-label="Price" locale="en-US" defaultValue={0} onValueChange={onValueChange} />)
    screen.getByRole("spinbutton").focus()
    await userEvent.keyboard("{ArrowDown}")
    expect(onValueChange).not.toHaveBeenCalled()
  })
})
