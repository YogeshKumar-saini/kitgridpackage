import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { CodeTabs } from "./code-tabs.js"

const items = [
  { value: "npm", label: "npm", code: "npm i kitgrid" },
  { value: "pnpm", label: "pnpm", code: "pnpm add kitgrid" },
  { value: "bun", label: "bun", code: "bun add kitgrid" },
]

describe("CodeTabs", () => {
  it("wires tabs to a single panel", () => {
    render(<CodeTabs items={items} label="Install" />)
    expect(screen.getByRole("tablist", { name: "Install" })).toBeInTheDocument()
    const npm = screen.getByRole("tab", { name: "npm" })
    expect(npm).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tabpanel", { name: "npm" })).toHaveTextContent("npm i kitgrid")
  })

  it("moves and selects with arrow keys", async () => {
    const user = userEvent.setup()
    const onValueChange = jest.fn()
    render(<CodeTabs items={items} onValueChange={onValueChange} />)
    screen.getByRole("tab", { name: "npm" }).focus()
    await user.keyboard("{ArrowRight}")
    expect(screen.getByRole("tab", { name: "pnpm" })).toHaveFocus()
    expect(onValueChange).toHaveBeenLastCalledWith("pnpm")
    await user.keyboard("{End}")
    expect(screen.getByRole("tabpanel")).toHaveTextContent("bun add kitgrid")
  })

  it("copies the active sample", async () => {
    const user = userEvent.setup()
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    render(<CodeTabs items={items} defaultValue="pnpm" />)
    await user.click(screen.getByRole("button", { name: "Copy code" }))
    expect(writeText).toHaveBeenCalledWith("pnpm add kitgrid")
  })
})
