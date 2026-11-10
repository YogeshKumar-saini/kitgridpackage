import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Toolbar, ToolbarButton, ToolbarSeparator, ToolbarToggle } from "./toolbar.js"

const Example = () => (
  <>
    <button type="button">Before</button>
    <Toolbar aria-label="Formatting">
      <ToolbarToggle label="Bold" icon={<svg />} />
      <ToolbarToggle label="Italic" icon={<svg />} />
      <ToolbarSeparator />
      <ToolbarButton>Share</ToolbarButton>
    </Toolbar>
    <button type="button">After</button>
  </>
)

describe("Toolbar", () => {
  it("is a labelled toolbar with a single tab stop", async () => {
    render(<Example />)
    expect(screen.getByRole("toolbar", { name: "Formatting" })).toBeInTheDocument()
    screen.getByRole("button", { name: "Before" }).focus()
    await userEvent.tab()
    expect(screen.getByRole("button", { name: "Bold" })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus()
  })

  it("roves with arrows, Home and End, and remembers the last item", async () => {
    render(<Example />)
    screen.getByRole("button", { name: "Bold" }).focus()
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByRole("button", { name: "Italic" })).toHaveFocus()
    await userEvent.keyboard("{End}")
    expect(screen.getByRole("button", { name: "Share" })).toHaveFocus()
    await userEvent.keyboard("{Home}")
    expect(screen.getByRole("button", { name: "Bold" })).toHaveFocus()
    await userEvent.keyboard("{ArrowLeft}")
    expect(screen.getByRole("button", { name: "Share" })).toHaveFocus()
    await userEvent.tab()
    await userEvent.tab({ shift: true })
    expect(screen.getByRole("button", { name: "Share" })).toHaveFocus()
  })

  it("toggles pressed state", async () => {
    render(<Example />)
    const bold = screen.getByRole("button", { name: "Bold" })
    expect(bold).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(bold)
    expect(bold).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "vertical")
  })
})
