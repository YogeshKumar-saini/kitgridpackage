import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ToggleGroup, ToggleGroupItem } from "./toggle-group.js"

const Align = (props: Partial<Parameters<typeof ToggleGroup>[0]>) => (
  <ToggleGroup aria-label="Alignment" {...(props as object)}>
    <ToggleGroupItem value="left">Left</ToggleGroupItem>
    <ToggleGroupItem value="center">Center</ToggleGroupItem>
    <ToggleGroupItem value="right" disabled>
      Right
    </ToggleGroupItem>
  </ToggleGroup>
)

describe("ToggleGroup", () => {
  it("has one tab stop on the pressed item", async () => {
    render(
      <>
        <button type="button">Before</button>
        <Align defaultValue="center" />
      </>,
    )
    expect(screen.getByRole("group", { name: "Alignment" })).toBeInTheDocument()
    screen.getByRole("button", { name: "Before" }).focus()
    await userEvent.tab()
    expect(screen.getByRole("button", { name: "Center" })).toHaveFocus()
  })

  it("moves with the arrow keys and skips disabled items", async () => {
    render(<Align />)
    await userEvent.tab()
    expect(screen.getByRole("button", { name: "Left" })).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByRole("button", { name: "Center" })).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByRole("button", { name: "Left" })).toHaveFocus()
  })

  it("single mode presses one item and can clear it", async () => {
    const onValueChange = jest.fn()
    render(<Align onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole("button", { name: "Left" }))
    expect(onValueChange).toHaveBeenLastCalledWith("left")
    await userEvent.click(screen.getByRole("button", { name: "Center" }))
    expect(screen.getByRole("button", { name: "Left" })).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(screen.getByRole("button", { name: "Center" }))
    expect(onValueChange).toHaveBeenLastCalledWith(null)
  })

  it("required single mode keeps one item pressed", async () => {
    render(<Align defaultValue="left" required />)
    await userEvent.click(screen.getByRole("button", { name: "Left" }))
    expect(screen.getByRole("button", { name: "Left" })).toHaveAttribute("aria-pressed", "true")
  })

  it("multiple mode reports every pressed value", async () => {
    const onValueChange = jest.fn()
    render(
      <ToggleGroup type="multiple" aria-label="Format" onValueChange={onValueChange}>
        <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
        <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
      </ToggleGroup>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Bold" }))
    await userEvent.click(screen.getByRole("button", { name: "Italic" }))
    expect(onValueChange).toHaveBeenLastCalledWith(["bold", "italic"])
  })
})
