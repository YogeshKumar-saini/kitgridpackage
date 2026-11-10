import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { KeyboardShortcutsDialog } from "./keyboard-shortcuts-dialog.js"

const groups = [
  {
    title: "General",
    shortcuts: [
      { keys: ["mod", "k"], label: "Open command menu" },
      { keys: ["?"], label: "Show shortcuts" },
    ],
  },
  { title: "Editing", shortcuts: [{ keys: ["mod", "z"], label: "Undo" }] },
]

describe("KeyboardShortcutsDialog", () => {
  it("opens with the ? hotkey and focuses search", async () => {
    render(<KeyboardShortcutsDialog groups={groups} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    fireEvent.keyDown(document.body, { key: "?" })
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeInTheDocument()
    expect(screen.getByRole("searchbox", { name: "Search shortcuts" })).toHaveFocus()
    expect(screen.getByRole("region", { name: "General" })).toBeInTheDocument()
  })

  it("ignores the hotkey while typing in a field", () => {
    render(
      <>
        <input aria-label="Note" />
        <KeyboardShortcutsDialog groups={groups} />
      </>,
    )
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Note" }), { key: "?" })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("filters shortcuts and shows an empty state", async () => {
    render(<KeyboardShortcutsDialog groups={groups} defaultOpen />)
    const search = screen.getByRole("searchbox")
    await userEvent.type(search, "undo")
    expect(screen.getByText("Undo")).toBeInTheDocument()
    expect(screen.queryByText("Open command menu")).not.toBeInTheDocument()
    await userEvent.clear(search)
    await userEvent.type(search, "zzz")
    expect(screen.getByRole("status")).toHaveTextContent("No matches")
  })
})
