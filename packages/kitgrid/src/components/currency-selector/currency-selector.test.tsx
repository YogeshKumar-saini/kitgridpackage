import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { CurrencySelector } from "./currency-selector.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

describe("CurrencySelector", () => {
  it("names options with code and localized currency name", async () => {
    const onValueChange = jest.fn()
    render(
      <CurrencySelector
        currencies={["USD", "EUR", { code: "INR", label: "Rupee" }]}
        defaultValue="USD"
        locale="en-US"
        onValueChange={onValueChange}
      />,
    )
    const trigger = screen.getByRole("combobox", { name: /Currency/ })
    await userEvent.click(trigger)
    expect(screen.getByRole("option", { name: /EUR · Euro/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("option", { name: /INR · Rupee/ }))
    expect(onValueChange).toHaveBeenCalledWith("INR")
  })
})
