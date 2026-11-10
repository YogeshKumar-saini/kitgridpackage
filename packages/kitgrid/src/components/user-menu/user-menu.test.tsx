import { render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { DropdownMenuItem } from "../dropdown-menu/dropdown-menu.js"
import { UserMenu } from "./user-menu.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

describe("UserMenu", () => {
  it("opens a menu with the account header and items", async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    render(
      <UserMenu name="Priya Raman" email="priya@northwind.io">
        <DropdownMenuItem onSelect={onSelect}>Settings</DropdownMenuItem>
        <DropdownMenuItem>Sign out</DropdownMenuItem>
      </UserMenu>,
    )
    const trigger = screen.getByRole("button", { name: "Account menu for Priya Raman" })
    expect(trigger).toHaveAttribute("aria-haspopup", "menu")
    await user.click(trigger)
    const menu = screen.getByRole("menu")
    expect(within(menu).getByText("priya@northwind.io")).toBeInTheDocument()
    await user.click(within(menu).getByRole("menuitem", { name: "Settings" }))
    expect(onSelect).toHaveBeenCalled()
  })

  it("uses the visible name as the trigger name when shown", () => {
    render(<UserMenu name="Mateo Alvarez" showName />)
    expect(screen.getByRole("button", { name: "Mateo Alvarez" })).toBeInTheDocument()
  })
})
