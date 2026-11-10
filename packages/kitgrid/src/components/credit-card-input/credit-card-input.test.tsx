import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { CreditCardInput, detectCardBrand, luhnCheck } from "./credit-card-input.js"

describe("card helpers", () => {
  it("detects brands and checks Luhn", () => {
    expect(detectCardBrand("4242")).toBe("visa")
    expect(detectCardBrand("3782")).toBe("amex")
    expect(detectCardBrand("5555")).toBe("mastercard")
    expect(luhnCheck("4242424242424242")).toBe(true)
    expect(luhnCheck("4242424242424241")).toBe(false)
  })
})

describe("CreditCardInput", () => {
  it("groups the number, advances to expiry and then to the code", async () => {
    const onValueChange = jest.fn()
    render(<CreditCardInput onValueChange={onValueChange} />)
    const number = screen.getByRole("textbox", { name: "Card number" })
    await userEvent.type(number, "4242424242424242")
    expect(number).toHaveValue("4242 4242 4242 4242")
    expect(screen.getByRole("textbox", { name: "Expiry date" })).toHaveFocus()
    await userEvent.keyboard("1228")
    expect(screen.getByRole("textbox", { name: "Expiry date" })).toHaveValue("12/28")
    expect(screen.getByRole("textbox", { name: "Security code" })).toHaveFocus()
    await userEvent.keyboard("12345")
    expect(onValueChange).toHaveBeenLastCalledWith({
      number: "4242424242424242",
      expiry: "12/28",
      cvc: "123",
    })
  })

  it("uses the Amex layout and flags a failed Luhn check", async () => {
    render(<CreditCardInput />)
    const number = screen.getByRole("textbox", { name: "Card number" })
    await userEvent.type(number, "378282246310007")
    expect(number).toHaveValue("3782 822463 10007")
    expect(number).toHaveAttribute("aria-invalid", "true")
  })

  it("pads a single-digit month", async () => {
    render(<CreditCardInput />)
    const expiry = screen.getByRole("textbox", { name: "Expiry date" })
    await userEvent.type(expiry, "4")
    expect(expiry).toHaveValue("04")
  })
})
