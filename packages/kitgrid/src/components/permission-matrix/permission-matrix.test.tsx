import { fireEvent, render, screen } from "@testing-library/react"
import { PermissionMatrix } from "./permission-matrix.js"

const roles = [
  { id: "owner", label: "Owner" },
  { id: "editor", label: "Editor" },
  { id: "viewer", label: "Viewer" },
]

const permissions = [
  { id: "view", label: "View reports", group: "Reports" },
  { id: "export", label: "Export data", group: "Reports" },
  { id: "billing", label: "Manage billing", group: "Account" },
]

const setup = (props: Partial<Parameters<typeof PermissionMatrix>[0]> = {}) =>
  render(
    <PermissionMatrix
      caption="Role permissions"
      roles={roles}
      permissions={permissions}
      defaultValue={{ owner: ["view", "export", "billing"], editor: ["view"] }}
      locked={{ owner: ["billing"] }}
      {...props}
    />,
  )

describe("PermissionMatrix", () => {
  it("is a grid whose cells are named by their permission and role", () => {
    setup()
    expect(screen.getByRole("grid", { name: "Role permissions" })).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "Export data Owner" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Export data Editor" })).not.toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Manage billing Owner" })).toBeDisabled()
    expect(screen.getByRole("columnheader", { name: "Reports" })).toBeInTheDocument()
  })

  it("keeps one tab stop and moves focus with arrows, Home, End and Ctrl+End", () => {
    setup()
    const first = screen.getByRole("checkbox", { name: "View reports Owner" })
    expect(first).toHaveAttribute("tabindex", "0")
    expect(screen.getByRole("checkbox", { name: "View reports Editor" })).toHaveAttribute(
      "tabindex",
      "-1",
    )
    first.focus()
    fireEvent.keyDown(first, { key: "ArrowRight" })
    const editor = screen.getByRole("checkbox", { name: "View reports Editor" })
    expect(editor).toHaveFocus()
    expect(editor).toHaveAttribute("tabindex", "0")

    fireEvent.keyDown(editor, { key: "ArrowDown" })
    expect(screen.getByRole("checkbox", { name: "Export data Editor" })).toHaveFocus()

    fireEvent.keyDown(document.activeElement as Element, { key: "End" })
    expect(screen.getByRole("checkbox", { name: "Export data Viewer" })).toHaveFocus()

    fireEvent.keyDown(document.activeElement as Element, { key: "Home", ctrlKey: true })
    expect(first).toHaveFocus()
  })

  it("skips locked cells while moving", () => {
    setup()
    const exportOwner = screen.getByRole("checkbox", { name: "Export data Owner" })
    exportOwner.focus()
    fireEvent.keyDown(exportOwner, { key: "ArrowDown" })
    expect(exportOwner).toHaveFocus()
  })

  it("toggles a cell and reports the new grants", () => {
    const onValueChange = jest.fn()
    setup({ onValueChange })
    fireEvent.click(screen.getByRole("checkbox", { name: "Export data Editor" }))
    expect(onValueChange).toHaveBeenLastCalledWith({
      owner: ["view", "export", "billing"],
      editor: ["view", "export"],
    })
  })

  it("grants or clears a whole column, leaving locked cells alone", () => {
    const onValueChange = jest.fn()
    setup({ columnToggles: true, onValueChange, control: "switch" })
    const owner = screen.getByRole("checkbox", { name: "Grant all to Owner" })
    expect(owner).toBeChecked()
    const editor = screen.getByRole("checkbox", {
      name: "Grant all to Editor",
    }) as HTMLInputElement
    expect(editor.indeterminate).toBe(true)
    expect(screen.getByRole("switch", { name: "View reports Viewer" })).not.toBeChecked()

    fireEvent.click(owner)
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ owner: ["billing"] }),
    )
  })
})
