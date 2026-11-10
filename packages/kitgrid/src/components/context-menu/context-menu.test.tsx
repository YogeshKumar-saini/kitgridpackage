import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./context-menu.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

const Example = ({ onCopy = () => {} }: { onCopy?: () => void }) => (
  <ContextMenu>
    <ContextMenuTrigger tabIndex={0} aria-label="Canvas">
      Area
    </ContextMenuTrigger>
    <ContextMenuContent aria-label="Canvas actions">
      <ContextMenuItem onSelect={onCopy}>Copy</ContextMenuItem>
      <ContextMenuItem>Paste</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuCheckboxItem>Snap to grid</ContextMenuCheckboxItem>
    </ContextMenuContent>
  </ContextMenu>
)

describe("ContextMenu", () => {
  it("opens on right-click with focus on the first item", () => {
    render(<Example />)
    fireEvent.contextMenu(screen.getByText("Area"), { clientX: 40, clientY: 60 })
    expect(screen.getByRole("menu", { name: "Canvas actions" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Copy" })).toHaveFocus()
  })

  it("moves with arrows and selects with Enter, closing the menu", async () => {
    const onCopy = jest.fn()
    render(<Example onCopy={onCopy} />)
    fireEvent.contextMenu(screen.getByText("Area"))
    await userEvent.keyboard("{ArrowDown}")
    expect(screen.getByRole("menuitem", { name: "Paste" })).toHaveFocus()
    await userEvent.keyboard("{ArrowUp}{Enter}")
    expect(onCopy).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })

  it("toggles checkbox items without closing", async () => {
    render(<Example />)
    fireEvent.contextMenu(screen.getByText("Area"))
    const snap = screen.getByRole("menuitemcheckbox", { name: "Snap to grid" })
    await userEvent.click(snap)
    expect(snap).toHaveAttribute("aria-checked", "true")
    expect(screen.getByRole("menu")).toBeInTheDocument()
  })

  it("opens from the keyboard with Shift+F10 and closes on Escape, restoring focus", async () => {
    render(<Example />)
    const trigger = screen.getByLabelText("Canvas")
    trigger.focus()
    await userEvent.keyboard("{Shift>}{F10}{/Shift}")
    expect(screen.getByRole("menu")).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    await new Promise((resolve) => requestAnimationFrame(resolve))
    expect(trigger).toHaveFocus()
  })
})
