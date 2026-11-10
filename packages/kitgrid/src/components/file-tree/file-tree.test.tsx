import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { FileTree } from "./file-tree.js"

const paths = ["src/app.tsx", "src/lib/util.ts", "README.md", "public/"]

describe("FileTree", () => {
  it("infers folders and sorts them before files", () => {
    render(<FileTree paths={paths} label="Repo" expandAll />)
    const names = screen
      .getAllByRole("treeitem")
      .map((item) => item.getAttribute("aria-level") + ":" + item.querySelector(".kg-tree-view__label")?.textContent)
    expect(names).toEqual(["1:public", "1:src", "2:lib", "3:util.ts", "2:app.tsx", "1:README.md"])
  })

  it("reports file selections but not folder toggles", async () => {
    const user = userEvent.setup()
    const onSelectPath = jest.fn()
    render(<FileTree paths={paths} label="Repo" expandAll onSelectPath={onSelectPath} />)
    await user.click(screen.getByText("util.ts"))
    expect(onSelectPath).toHaveBeenCalledWith("src/lib/util.ts")
    await user.click(screen.getByText("src"))
    expect(onSelectPath).toHaveBeenCalledTimes(1)
  })

  it("marks git status in text, not color alone", () => {
    render(<FileTree paths={paths} label="Repo" expandAll status={{ "README.md": "modified" }} />)
    expect(screen.getByText("M")).toHaveAttribute("data-status", "modified")
    expect(screen.getByText("modified", { exact: false })).toBeInTheDocument()
  })
})
