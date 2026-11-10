import { render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { AddressForm, emptyAddress } from "./address-form.js"

describe("AddressForm", () => {
  it("labels fields for the US with autocomplete tokens", () => {
    render(<AddressForm />)
    expect(screen.getByRole("group", { name: "Shipping address" })).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: /ZIP code/ })).toHaveAttribute(
      "autocomplete",
      "shipping postal-code",
    )
    expect(screen.getByRole("textbox", { name: /ZIP code/ })).toHaveAttribute("inputmode", "numeric")
    expect(screen.getByRole("textbox", { name: /State/ })).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: /Full name/ })).toHaveAttribute(
      "autocomplete",
      "shipping name",
    )
  })

  it("relabels and reorders for other countries", () => {
    const { rerender } = render(<AddressForm value={emptyAddress("GB")} />)
    expect(screen.getByRole("textbox", { name: /Postcode/ })).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "County (optional)" })).not.toBeRequired()
    rerender(<AddressForm value={emptyAddress("DE")} />)
    const boxes = screen.getAllByRole("textbox").map((box) => box.getAttribute("autocomplete"))
    expect(boxes.indexOf("shipping postal-code")).toBeLessThan(
      boxes.indexOf("shipping address-level2"),
    )
    expect(screen.queryByRole("textbox", { name: /State|County|Region/ })).toBeNull()
  })

  it("reveals the second address line on request", async () => {
    render(<AddressForm />)
    expect(screen.queryByRole("textbox", { name: /Apartment/ })).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "+ Add apartment, suite, etc." }))
    const line2 = screen.getByRole("textbox", { name: "Apartment, suite, etc. (optional)" })
    await waitFor(() => expect(line2).toHaveFocus())
  })

  it("reports changes with the whole address", async () => {
    const onValueChange = jest.fn()
    render(<AddressForm onValueChange={onValueChange} namePrefix="ship" />)
    const city = screen.getByRole("textbox", { name: /City/ })
    expect(city).toHaveAttribute("name", "ship-city")
    await userEvent.type(city, "A")
    expect(onValueChange).toHaveBeenLastCalledWith(expect.objectContaining({ city: "A", country: "US" }))
  })
})
