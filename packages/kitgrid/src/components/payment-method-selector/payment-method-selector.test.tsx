import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { PaymentMethodSelector } from "./payment-method-selector.js"

const methods = [
  { id: "card", label: "Card", content: <input aria-label="Card number" /> },
  { id: "paypal", label: "PayPal", description: "Redirects to PayPal" },
  { id: "klarna", label: "Klarna", disabled: true },
]

describe("PaymentMethodSelector", () => {
  it("is a named radio group defaulting to the first enabled method", () => {
    render(<PaymentMethodSelector methods={methods} />)
    expect(screen.getByRole("group", { name: "Payment method" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Card" })).toBeChecked()
    expect(screen.getByRole("radio", { name: /Klarna/ })).toBeDisabled()
  })

  it("keeps hidden method content inert until selected", async () => {
    const onValueChange = jest.fn()
    const { container } = render(
      <PaymentMethodSelector methods={methods} defaultValue="paypal" onValueChange={onValueChange} />,
    )
    expect(container.querySelector(".kg-payment-methods__reveal")).toHaveAttribute("inert")
    await userEvent.click(screen.getByRole("radio", { name: "Card" }))
    expect(onValueChange).toHaveBeenCalledWith("card")
    expect(container.querySelector(".kg-payment-methods__reveal")).not.toHaveAttribute("inert")
  })
})
