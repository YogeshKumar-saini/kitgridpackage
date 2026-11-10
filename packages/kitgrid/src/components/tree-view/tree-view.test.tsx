import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import { TreeView, type TreeViewNode } from "./tree-view.js"

const nodes: TreeViewNode[] = [
  {
    id: "src",
    label: "src",
    children: [
      { id: "app", label: "app.tsx" },
      { id: "lib", label: "lib", children: [{ id: "util", label: "util.ts" }] },
    ],
  },
  { id: "readme", label: "README.md" },
  { id: "locked", label: "secrets", disabled: true },
]

const item = (name: string) => screen.getByRole("treeitem", { name })

describe("TreeView", () => {
  it("exposes tree semantics with levels and positions", () => {
    render(<TreeView nodes={nodes} label="Files" defaultExpanded={["src"]} />)
    expect(screen.getByRole("tree", { name: "Files" })).toBeInTheDocument()
    expect(item("src")).toHaveAttribute("aria-expanded", "true")
    expect(item("app.tsx")).toHaveAttribute("aria-level", "2")
    expect(item("app.tsx")).toHaveAttribute("aria-posinset", "1")
    expect(item("README.md")).not.toHaveAttribute("aria-expanded")
    expect(screen.getAllByRole("group")).toHaveLength(1)
  })

  it("navigates with arrows, opens and closes branches", async () => {
    const user = userEvent.setup()
    render(<TreeView nodes={nodes} label="Files" />)
    await user.tab()
    expect(item("src")).toHaveFocus()
    await user.keyboard("{ArrowRight}")
    expect(item("src")).toHaveAttribute("aria-expanded", "true")
    await user.keyboard("{ArrowRight}")
    expect(item("app.tsx")).toHaveFocus()
    await user.keyboard("{ArrowDown}{ArrowRight}{ArrowRight}")
    expect(item("util.ts")).toHaveFocus()
    await user.keyboard("{ArrowLeft}")
    expect(item("lib")).toHaveFocus()
    await user.keyboard("{ArrowLeft}")
    expect(item("lib")).toHaveAttribute("aria-expanded", "false")
    await user.keyboard("{End}")
    expect(item("README.md")).toHaveFocus()
    await user.keyboard("{Home}")
    expect(item("src")).toHaveFocus()
  })

  it("selects with Space and Enter in single mode", async () => {
    const user = userEvent.setup()
    const onSelectedChange = jest.fn()
    render(<TreeView nodes={nodes} label="Files" onSelectedChange={onSelectedChange} />)
    await user.tab()
    await user.keyboard("{End} ")
    expect(onSelectedChange).toHaveBeenLastCalledWith(["readme"])
    expect(item("README.md")).toHaveAttribute("aria-selected", "true")
  })

  it("finds nodes by typing", async () => {
    const user = userEvent.setup()
    render(<TreeView nodes={nodes} label="Files" />)
    await user.tab()
    await user.keyboard("r")
    expect(item("README.md")).toHaveFocus()
  })

  it("cascades checkboxes with a mixed parent", async () => {
    const user = userEvent.setup()
    render(<TreeView nodes={nodes} label="Files" checkable defaultExpanded={["src"]} />)
    await user.click(screen.getByText("app.tsx"))
    expect(item("app.tsx")).toHaveAttribute("aria-checked", "true")
    expect(item("src")).toHaveAttribute("aria-checked", "mixed")
    await user.click(screen.getByText("src"))
    expect(item("src")).toHaveAttribute("aria-checked", "true")
  })

  it("loads lazy children on first expand", async () => {
    const user = userEvent.setup()
    const Lazy = () => {
      const [tree, setTree] = useState<TreeViewNode[]>([
        { id: "remote", label: "remote", hasChildren: true },
      ])
      return (
        <TreeView
          nodes={tree}
          label="Lazy"
          onLoadChildren={async (node) => {
            await Promise.resolve()
            setTree([{ ...node, children: [{ id: "child", label: "fetched.json" }] }])
          }}
        />
      )
    }
    render(<Lazy />)
    await user.click(screen.getByText("remote"))
    expect(await screen.findByRole("treeitem", { name: "fetched.json" })).toBeInTheDocument()
  })
})
