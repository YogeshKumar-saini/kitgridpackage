import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { WorkspaceSwitcher, type WorkspaceSwitcherWorkspace } from "./workspace-switcher.js"

const workspaces: WorkspaceSwitcherWorkspace[] = [
  { id: "nw", name: "Northwind", meta: "Pro" },
  { id: "ln", name: "Lumen Labs", meta: "Team" },
  { id: "ot", name: "Otter Retail" },
]

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

describe("WorkspaceSwitcher", () => {
  it("names the trigger with the current workspace and focuses the search", async () => {
    const user = userEvent.setup()
    render(<WorkspaceSwitcher workspaces={workspaces} />)
    await user.click(screen.getByRole("button", { name: "Switch workspace, current: Northwind" }))
    const combobox = screen.getByRole("combobox", { name: "Find workspace" })
    expect(combobox).toHaveFocus()
    expect(screen.getByRole("option", { name: /Northwind/ })).toHaveAttribute("aria-selected", "true")
  })

  it("filters, moves with arrows and switches on Enter", async () => {
    const user = userEvent.setup()
    const onValueChange = jest.fn()
    render(<WorkspaceSwitcher workspaces={workspaces} onValueChange={onValueChange} defaultOpen />)
    const combobox = screen.getByRole("combobox")
    await user.type(combobox, "l")
    expect(screen.getAllByRole("option")).toHaveLength(2)
    await user.keyboard("{ArrowDown}")
    const second = screen.getAllByRole("option")[1] as HTMLElement
    expect(combobox).toHaveAttribute("aria-activedescendant", second.id)
    await user.keyboard("{Enter}")
    expect(onValueChange).toHaveBeenCalledWith("ot")
    expect(screen.queryByRole("combobox")).toBeNull()
  })

  it("offers a create row", async () => {
    const user = userEvent.setup()
    const onCreate = jest.fn()
    render(<WorkspaceSwitcher workspaces={workspaces} onCreate={onCreate} defaultOpen />)
    await user.click(screen.getByRole("option", { name: /Create workspace/ }))
    expect(onCreate).toHaveBeenCalled()
  })
})
