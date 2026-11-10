import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "./menubar.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

const Example = ({ onNew = () => {} }: { onNew?: () => void }) => (
  <Menubar aria-label="Editor">
    <MenubarMenu value="file">
      <MenubarTrigger>File</MenubarTrigger>
      <MenubarContent>
        <MenubarItem onSelect={onNew}>New</MenubarItem>
        <MenubarItem>Open</MenubarItem>
      </MenubarContent>
    </MenubarMenu>
    <MenubarMenu value="edit">
      <MenubarTrigger>Edit</MenubarTrigger>
      <MenubarContent>
        <MenubarItem>Undo</MenubarItem>
        <MenubarItem>Redo</MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  </Menubar>
)

describe("Menubar", () => {
  it("exposes a menubar with a single tab stop", () => {
    render(<Example />)
    expect(screen.getByRole("menubar", { name: "Editor" })).toBeInTheDocument()
    const [file, edit] = screen.getAllByRole("menuitem")
    expect(file).toHaveAttribute("tabindex", "0")
    expect(edit).toHaveAttribute("tabindex", "-1")
    expect(file).toHaveAttribute("aria-haspopup", "menu")
  })

  it("moves between triggers with arrows and opens with ArrowDown", async () => {
    render(<Example />)
    await userEvent.tab()
    expect(screen.getByRole("menuitem", { name: "File" })).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}")
    const edit = screen.getByRole("menuitem", { name: "Edit" })
    expect(edit).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}")
    expect(edit).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("menuitem", { name: "Undo" })).toHaveFocus()
  })

  it("switches menus with Left/Right from inside an open menu", async () => {
    render(<Example />)
    await userEvent.tab()
    await userEvent.keyboard("{ArrowDown}")
    expect(screen.getByRole("menuitem", { name: "New" })).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByRole("menuitem", { name: "Undo" })).toHaveFocus()
    expect(screen.queryByRole("menuitem", { name: "New" })).not.toBeInTheDocument()
  })

  it("closes on Escape returning focus, and activates items", async () => {
    const onNew = jest.fn()
    render(<Example onNew={onNew} />)
    const file = screen.getByRole("menuitem", { name: "File" })
    await userEvent.click(file)
    expect(screen.getByRole("menu", { name: "File" })).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(file).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await userEvent.keyboard("{Enter}")
    expect(onNew).toHaveBeenCalledTimes(1)
  })
})
