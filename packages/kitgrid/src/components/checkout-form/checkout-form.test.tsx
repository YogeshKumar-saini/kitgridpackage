import { render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { CheckoutForm } from "./checkout-form.js"

const shippingOptions = [
  { id: "standard", label: "Standard", detail: "3-5 days", price: 0 },
  { id: "express", label: "Express", detail: "1-2 days", price: 12 },
]

describe("CheckoutForm", () => {
  it("renders numbered, named sections and the total on the button", async () => {
    render(<CheckoutForm subtotal={136} shippingOptions={shippingOptions} onSubmit={() => {}} />)
    expect(screen.getByRole("region", { name: "Contact" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Pay $136.00" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("radio", { name: /Express/ }))
    expect(screen.getByRole("button", { name: "Pay $148.00" })).toBeInTheDocument()
  })

  it("blocks submit and focuses the first invalid field", async () => {
    const onSubmit = jest.fn()
    render(<CheckoutForm subtotal={50} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole("button", { name: "Pay $50.00" }))
    expect(onSubmit).not.toHaveBeenCalled()
    const email = screen.getByRole("textbox", { name: /Email/ })
    expect(email).toHaveAttribute("aria-invalid", "true")
    await waitFor(() => expect(email).toHaveFocus())
  })

  it("submits the collected checkout", async () => {
    const onSubmit = jest.fn()
    render(
      <CheckoutForm
        subtotal={50}
        shippingOptions={shippingOptions}
        onSubmit={onSubmit}
        defaultValue={{
          email: "maya@nook.studio",
          address: {
            country: "US",
            name: "Maya Chen",
            line1: "88 Elm St",
            line2: "",
            city: "Austin",
            region: "TX",
            postalCode: "78701",
            phone: "",
          },
        }}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: "Pay $50.00" }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ email: "maya@nook.studio", shippingOption: "standard" }),
    )
  })
})
