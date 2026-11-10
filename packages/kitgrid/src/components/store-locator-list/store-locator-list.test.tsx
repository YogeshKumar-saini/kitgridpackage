import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { StoreLocatorList } from "./store-locator-list.js"

const stores = [
  { id: "soho", name: "SoHo", address: "120 Prince St", distance: 1.2, open: true, hours: "Closes 8 pm", stock: "in-stock" as const },
  { id: "bk", name: "Williamsburg", address: "88 N 6th St", distance: 4.8, open: false, stock: "out-of-stock" as const },
]

describe("StoreLocatorList", () => {
  it("lists stores as radios described by address, hours and stock", () => {
    render(<StoreLocatorList stores={stores} unit="mi" locale="en-US" />)
    expect(screen.getByRole("group", { name: "Pickup store" })).toBeInTheDocument()
    const soho = screen.getByRole("radio", { name: /SoHo/ })
    expect(soho).toHaveAccessibleName("SoHo 1.2 mi")
    expect(soho).toHaveAccessibleDescription("120 Prince St. Open, Closes 8 pm. In stock")
    expect(screen.getByRole("radio", { name: /Williamsburg/ })).toBeDisabled()
  })

  it("selects a store", async () => {
    const onValueChange = jest.fn()
    render(<StoreLocatorList stores={stores} onValueChange={onValueChange} />)
    await userEvent.click(screen.getByText("SoHo"))
    expect(onValueChange).toHaveBeenCalledWith("soho")
    expect(screen.getByRole("radio", { name: /SoHo/ })).toBeChecked()
  })
})
