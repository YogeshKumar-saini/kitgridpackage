import { render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Popconfirm } from "./popconfirm.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

describe("Popconfirm", () => {
  it("opens an alertdialog anchored to the trigger with focus on Cancel", async () => {
    render(
      <Popconfirm title="Remove member?" description="Access ends now.">
        <button type="button">Remove</button>
      </Popconfirm>,
    )
    const trigger = screen.getByRole("button", { name: "Remove" })
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    const dialog = screen.getByRole("alertdialog", { name: "Remove member?" })
    expect(dialog).toHaveAccessibleDescription("Access ends now.")
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus()
  })

  it("confirms, awaiting async handlers, then returns focus", async () => {
    let resolve = () => {}
    const onConfirm = jest.fn(() => new Promise<void>((done) => (resolve = done)))
    render(
      <Popconfirm title="Archive?" onConfirm={onConfirm}>
        <button type="button">Archive</button>
      </Popconfirm>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Archive" }))
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }))
    expect(onConfirm).toHaveBeenCalled()
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    resolve()
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(), {
      timeout: 4000,
    })
    expect(screen.getByRole("button", { name: "Archive" })).toHaveFocus()
  })

  it("cancels on Escape", async () => {
    const onCancel = jest.fn()
    render(
      <Popconfirm title="Delete?" onCancel={onCancel}>
        <button type="button">Delete</button>
      </Popconfirm>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Delete" }))
    await userEvent.keyboard("{Escape}")
    expect(onCancel).toHaveBeenCalled()
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })
})
