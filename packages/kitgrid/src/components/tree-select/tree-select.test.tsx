import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { TreeSelect, type TreeSelectNode } from "./tree-select.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

const folders: TreeSelectNode[] = [
  {
    value: "design",
    label: "Design",
    children: [
      { value: "icons", label: "Icons" },
      { value: "brand", label: "Brand", children: [{ value: "logos", label: "Logos" }] },
    ],
  },
  { value: "finance", label: "Finance", children: [{ value: "q3", label: "Q3 reports" }] },
  { value: "archive", label: "Archive", disabled: true },
]

const item = (name: string) => screen.getByRole("treeitem", { name })

describe("TreeSelect", () => {
  it("opens a tree with focus on the first item", async () => {
    render(<TreeSelect aria-label="Folder" nodes={folders} />)
    await userEvent.click(screen.getByRole("button", { name: /^Folder/ }))
    expect(screen.getByRole("tree", { name: "Folder" })).toBeInTheDocument()
    expect(item("Design")).toHaveFocus()
    expect(item("Design")).toHaveAttribute("aria-expanded", "false")
  })

  it("walks, expands and collapses with the arrow keys", async () => {
    render(<TreeSelect aria-label="Folder" nodes={folders} />)
    await userEvent.click(screen.getByRole("button"))
    await userEvent.keyboard("{ArrowRight}")
    expect(item("Design")).toHaveAttribute("aria-expanded", "true")
    await userEvent.keyboard("{ArrowRight}")
    expect(item("Icons")).toHaveFocus()
    expect(item("Icons")).toHaveAttribute("aria-level", "2")
    await userEvent.keyboard("{ArrowLeft}")
    expect(item("Design")).toHaveFocus()
    await userEvent.keyboard("{ArrowLeft}")
    expect(item("Design")).toHaveAttribute("aria-expanded", "false")
    await userEvent.keyboard("{End}")
    expect(item("Archive")).toHaveFocus()
  })

  it("picks a leaf with Enter and shows its path", async () => {
    const onValueChange = jest.fn()
    render(<TreeSelect aria-label="Folder" nodes={folders} onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole("button"))
    await userEvent.keyboard("{ArrowDown}{ArrowRight}{ArrowRight}{Enter}")
    expect(onValueChange).toHaveBeenCalledWith("q3")
    const trigger = screen.getByRole("button", { name: /^Folder/ })
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveTextContent("Finance / Q3 reports")
  })

  it("reopens on the selected node with its branch expanded", async () => {
    render(<TreeSelect aria-label="Folder" nodes={folders} defaultValue="logos" />)
    await userEvent.click(screen.getByRole("button"))
    expect(item("Logos")).toHaveFocus()
    expect(item("Logos")).toHaveAttribute("aria-selected", "true")
  })

  it("closes on Escape", async () => {
    render(<TreeSelect aria-label="Folder" nodes={folders} />)
    await userEvent.click(screen.getByRole("button"))
    await userEvent.keyboard("{Escape}")
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false")
  })
})
