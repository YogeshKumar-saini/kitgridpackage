import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

const Actions = ({
  onSelect = () => {},
  onSort,
}: {
  onSelect?: (name: string, event: Event) => void
  onSort?: (value: string) => void
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuGroup>
        <DropdownMenuLabel>Order</DropdownMenuLabel>
        <DropdownMenuItem shortcut="⌘E" onSelect={(event) => onSelect("Edit", event)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem disabled onSelect={(event) => onSelect("Duplicate", event)}>
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(event) => onSelect("Archive", event)}>
          Archive
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem defaultChecked>Show prices</DropdownMenuCheckboxItem>
      <DropdownMenuRadioGroup defaultValue="new" onValueChange={onSort}>
        <DropdownMenuRadioItem value="new">Newest</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="price">Price</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuItem destructive onSelect={(event) => onSelect("Delete", event)}>
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)

const openWithKeyboard = async (key = "{ArrowDown}") => {
  screen.getByRole("button", { name: "Actions" }).focus()
  await userEvent.keyboard(key)
}

describe("DropdownMenu", () => {
  it("wires the menu button pattern", async () => {
    render(<Actions />)
    const trigger = screen.getByRole("button", { name: "Actions" })
    expect(trigger).toHaveAttribute("aria-haspopup", "menu")
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    await openWithKeyboard()
    const menu = screen.getByRole("menu", { name: "Actions" })
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(trigger).toHaveAttribute("aria-controls", menu.id)
    expect(screen.getByRole("group", { name: "Order" })).toBeInTheDocument()
  })

  it("focuses the first item on ArrowDown and the last on ArrowUp", async () => {
    const { unmount } = render(<Actions />)
    await openWithKeyboard("{ArrowDown}")
    expect(screen.getByRole("menuitem", { name: /Edit/ })).toHaveFocus()
    unmount()
    render(<Actions />)
    await openWithKeyboard("{ArrowUp}")
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus()
  })

  it("roves with arrows, Home and End, skipping disabled items and wrapping", async () => {
    render(<Actions />)
    await openWithKeyboard()
    await userEvent.keyboard("{ArrowDown}")
    expect(screen.getByRole("menuitem", { name: "Archive" })).toHaveFocus()
    await userEvent.keyboard("{End}")
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}")
    expect(screen.getByRole("menuitem", { name: /Edit/ })).toHaveFocus()
    await userEvent.keyboard("{ArrowUp}{Home}")
    expect(screen.getByRole("menuitem", { name: /Edit/ })).toHaveFocus()
  })

  it("moves focus by typeahead", async () => {
    render(<Actions />)
    await openWithKeyboard()
    await userEvent.keyboard("pr")
    expect(screen.getByRole("menuitemradio", { name: "Price" })).toHaveFocus()
  })

  it("selects with Enter, closes and returns focus to the trigger", async () => {
    const onSelect = jest.fn()
    render(<Actions onSelect={onSelect} />)
    await openWithKeyboard()
    await userEvent.keyboard("{Enter}")
    expect(onSelect).toHaveBeenCalledWith("Edit", expect.any(Event))
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Actions" })).toHaveFocus()
  })

  it("stays open when onSelect prevents default and ignores disabled items", async () => {
    const onSelect = jest.fn((_name: string, event: Event) => event.preventDefault())
    render(<Actions onSelect={onSelect} />)
    await userEvent.click(screen.getByRole("button", { name: "Actions" }))
    await userEvent.click(screen.getByRole("menuitem", { name: "Archive" }))
    expect(screen.getByRole("menu")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("menuitem", { name: "Duplicate" }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("menuitem", { name: "Duplicate" })).toHaveAttribute(
      "aria-disabled",
      "true",
    )
  })

  it("closes on Escape and Tab, returning focus to the trigger", async () => {
    render(<Actions />)
    const trigger = screen.getByRole("button", { name: "Actions" })
    await openWithKeyboard()
    await userEvent.keyboard("{Escape}")
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    await openWithKeyboard()
    await userEvent.tab()
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it("toggles checkbox and radio items without closing", async () => {
    const onSort = jest.fn()
    render(<Actions onSort={onSort} />)
    await userEvent.click(screen.getByRole("button", { name: "Actions" }))
    const prices = screen.getByRole("menuitemcheckbox", { name: "Show prices" })
    expect(prices).toHaveAttribute("aria-checked", "true")
    await userEvent.click(prices)
    expect(prices).toHaveAttribute("aria-checked", "false")
    await userEvent.click(screen.getByRole("menuitemradio", { name: "Price" }))
    expect(onSort).toHaveBeenCalledWith("price")
    expect(screen.getByRole("menuitemradio", { name: "Price" })).toHaveAttribute(
      "aria-checked",
      "true",
    )
    expect(screen.getByRole("menuitemradio", { name: "Newest" })).toHaveAttribute(
      "aria-checked",
      "false",
    )
    expect(screen.getByRole("menu")).toBeInTheDocument()
  })

  it("focuses the menu itself when opened by pointer, and items follow the pointer", async () => {
    render(<Actions />)
    await userEvent.click(screen.getByRole("button", { name: "Actions" }))
    expect(screen.getByRole("menu")).toHaveFocus()
    const archive = screen.getByRole("menuitem", { name: "Archive" })
    fireEvent.pointerMove(archive, { pointerType: "mouse" })
    expect(archive).toHaveFocus()
    fireEvent.pointerLeave(archive, { pointerType: "mouse" })
    expect(screen.getByRole("menu")).toHaveFocus()
  })
})
