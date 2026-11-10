import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import {
  CommandPalette,
  type CommandPaletteGroup,
  commandPaletteFilter,
} from "./command-palette.js"
import { matchesShortcut } from "./shortcut.js"
import { useCommandShortcut } from "./shortcut.js"

const go = jest.fn()

const groups: CommandPaletteGroup[] = [
  {
    heading: "Pages",
    items: [
      {
        id: "overview",
        label: "Overview",
        hint: "Read",
        onSelect: () => go("overview"),
      },
      {
        id: "anatomy",
        label: "Sales anatomy",
        hint: "Read",
        onSelect: () => go("anatomy"),
      },
      {
        id: "gallery",
        label: "Gallery",
        keywords: ["photos"],
        onSelect: () => go("gallery"),
      },
    ],
  },
  {
    heading: "Actions",
    items: [
      { id: "dark", label: "Switch to dark mode", shortcut: ["mod", "d"] },
      { id: "export", label: "Export report", disabled: true },
    ],
  },
]

const Harness = ({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) => {
  const [open, setOpen] = useState(false)
  useCommandShortcut(() => setOpen((value) => !value))
  return (
    <CommandPalette
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        onOpenChange?.(next)
      }}
      groups={groups}
    />
  )
}

const openPalette = () => fireEvent.keyDown(document, { key: "k", ctrlKey: true })

describe("CommandPalette", () => {
  beforeEach(() => go.mockClear())

  it("opens on Ctrl+K as a dialog with a combobox driving a grouped listbox", () => {
    render(<Harness />)
    expect(screen.queryByRole("dialog")).toBeNull()
    openPalette()
    const dialog = screen.getByRole("dialog", { name: "Search and commands" })
    expect(dialog).toBeInTheDocument()
    const input = screen.getByRole("combobox", { name: "Search and commands" })
    expect(input).toHaveFocus()
    expect(input).toHaveAttribute("aria-autocomplete", "list")
    const listbox = screen.getByRole("listbox")
    expect(input).toHaveAttribute("aria-controls", listbox.id)
    expect(screen.getByRole("group", { name: "Pages" })).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Actions" })).toBeInTheDocument()
  })

  it("moves the active option with the arrows, skipping disabled ones, and runs it on Enter", () => {
    const onOpenChange = jest.fn()
    render(<Harness onOpenChange={onOpenChange} />)
    openPalette()
    const input = screen.getByRole("combobox")
    const first = screen.getByRole("option", { name: /Overview/ })
    expect(first).toHaveAttribute("aria-selected", "true")
    expect(input).toHaveAttribute("aria-activedescendant", first.id)

    fireEvent.keyDown(input, { key: "ArrowUp" })
    expect(screen.getByRole("option", { name: /dark mode/ })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    fireEvent.keyDown(input, { key: "ArrowDown" })
    fireEvent.keyDown(input, { key: "ArrowDown" })
    expect(screen.getByRole("option", { name: /Sales anatomy/ })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    fireEvent.keyDown(input, { key: "Enter" })
    expect(go).toHaveBeenCalledWith("anatomy")
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it("filters by contains or word starts, highlights the match and hides empty groups", async () => {
    render(<Harness />)
    openPalette()
    await userEvent.type(screen.getByRole("combobox"), "anat")
    const options = screen.getAllByRole("option")
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveTextContent("Sales anatomy")
    expect(options[0]?.querySelector("mark")).toHaveTextContent("anat")
    expect(screen.queryByRole("group", { name: "Actions" })).toBeNull()
    expect(screen.getByRole("status")).toHaveTextContent("1 result")
  })

  it("matches keywords and shows an empty state when nothing matches", async () => {
    render(<Harness />)
    openPalette()
    const input = screen.getByRole("combobox")
    await userEvent.type(input, "photos")
    expect(screen.getByRole("option", { name: /Gallery/ })).toBeInTheDocument()
    await userEvent.clear(input)
    await userEvent.type(input, "zzz")
    expect(screen.queryAllByRole("option")).toHaveLength(0)
    expect(screen.getByText('Nothing matches "zzz"')).toBeInTheDocument()
  })

  it("selects with a click and ignores disabled options", async () => {
    render(<Harness />)
    openPalette()
    await userEvent.click(screen.getByRole("option", { name: /Export report/ }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("option", { name: /Gallery/ }))
    expect(go).toHaveBeenCalledWith("gallery")
  })
})

describe("commandPaletteFilter", () => {
  it("ranks a label prefix above a word start above a keyword, and rejects scattered letters", () => {
    const item = { id: "a", label: "Outlined panels", keywords: ["borders"] }
    expect(commandPaletteFilter(item, "out")).toBeGreaterThan(
      commandPaletteFilter(item, "pan"),
    )
    expect(commandPaletteFilter(item, "pan")).toBeGreaterThan(
      commandPaletteFilter(item, "borders"),
    )
    expect(commandPaletteFilter(item, "out pan")).toBeGreaterThan(0)
    expect(commandPaletteFilter(item, "utsa")).toBe(0)
  })
})

describe("matchesShortcut", () => {
  const event = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init)

  it("treats mod as Cmd or Ctrl and requires other modifiers to match exactly", () => {
    expect(matchesShortcut(event({ key: "k", metaKey: true }), ["mod", "k"])).toBe(true)
    expect(matchesShortcut(event({ key: "k", ctrlKey: true }), ["mod", "k"])).toBe(true)
    expect(matchesShortcut(event({ key: "k" }), ["mod", "k"])).toBe(false)
    expect(
      matchesShortcut(event({ key: "k", ctrlKey: true, shiftKey: true }), ["mod", "k"]),
    ).toBe(false)
    expect(matchesShortcut(event({ key: "/" }), ["/"])).toBe(true)
    expect(matchesShortcut(event({ key: "?", shiftKey: true }), ["?"])).toBe(true)
  })
})
