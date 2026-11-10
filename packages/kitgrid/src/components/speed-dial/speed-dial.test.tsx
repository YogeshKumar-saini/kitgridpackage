import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { SpeedDial } from "./speed-dial.js"

const actions = (onCopy = () => {}) => [
  { label: "Copy", icon: <svg />, onSelect: onCopy },
  { label: "Share", icon: <svg /> },
  { label: "Print", icon: <svg /> },
]

describe("SpeedDial", () => {
  it("toggles a group of actions from the main button", async () => {
    render(<SpeedDial actions={actions()} placement="static" />)
    const main = screen.getByRole("button", { name: "Quick actions" })
    expect(main).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByRole("button", { name: "Copy" }).closest("[inert]")).not.toBeNull()
    await userEvent.click(main)
    expect(main).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("group", { name: "Quick actions" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Copy" }).closest("[inert]")).toBeNull()
  })

  it("opens from the keyboard into the first action and roves with arrows", async () => {
    render(<SpeedDial actions={actions()} placement="static" />)
    screen.getByRole("button", { name: "Quick actions" }).focus()
    await userEvent.keyboard("{Enter}")
    expect(screen.getByRole("button", { name: "Copy" })).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}")
    expect(screen.getByRole("button", { name: "Share" })).toHaveFocus()
  })

  it("runs an action, closes and returns focus; Escape also closes", async () => {
    const onCopy = jest.fn()
    render(<SpeedDial actions={actions(onCopy)} placement="static" />)
    const main = screen.getByRole("button", { name: "Quick actions" })
    await userEvent.click(main)
    await userEvent.click(screen.getByRole("button", { name: "Copy" }))
    expect(onCopy).toHaveBeenCalled()
    expect(main).toHaveAttribute("aria-expanded", "false")
    expect(main).toHaveFocus()
    await userEvent.click(main)
    await userEvent.keyboard("{Escape}")
    expect(main).toHaveAttribute("aria-expanded", "false")
  })
})
