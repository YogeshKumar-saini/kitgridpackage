import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ToolbarButton } from "../toolbar/toolbar.js"
import { ActionBar } from "./action-bar.js"

describe("ActionBar", () => {
  it("renders nothing without a selection", () => {
    render(<ActionBar count={0} />)
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument()
  })

  it("shows a labelled toolbar with the count", () => {
    render(
      <ActionBar count={3} onClear={() => {}}>
        <ToolbarButton>Archive</ToolbarButton>
      </ActionBar>,
    )
    const bar = screen.getByRole("toolbar", { name: "Selection actions" })
    expect(bar).toHaveTextContent("3 selected")
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument()
  })

  it("clears from the button and from Escape", async () => {
    const onClear = jest.fn()
    render(
      <ActionBar count={2} onClear={onClear}>
        <ToolbarButton>Move</ToolbarButton>
      </ActionBar>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Clear selection" }))
    expect(onClear).toHaveBeenCalledTimes(1)
    screen.getByRole("button", { name: "Move" }).focus()
    await userEvent.keyboard("{Escape}")
    expect(onClear).toHaveBeenCalledTimes(2)
  })
})
