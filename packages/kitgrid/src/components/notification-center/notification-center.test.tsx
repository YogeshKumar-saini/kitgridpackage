import { render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { NotificationCenter, type NotificationCenterItem } from "./notification-center.js"

const items: NotificationCenterItem[] = [
  { id: "1", title: "Priya commented on Q3 revenue", time: "4m", actor: "Priya Raman" },
  { id: "2", title: "Export finished", time: "1h", actor: "System" },
  { id: "3", title: "Mateo shared a dashboard", time: "2d", actor: "Mateo Alvarez", read: true },
]

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

describe("NotificationCenter", () => {
  it("names the trigger with the unread count and opens a dialog", async () => {
    const user = userEvent.setup()
    render(<NotificationCenter notifications={items} />)
    const trigger = screen.getByRole("button", { name: "Notifications, 2 unread" })
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog")
    await user.click(trigger)
    const dialog = screen.getByRole("dialog", { name: "Notifications" })
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(3)
    expect(within(dialog).getByRole("button", { name: /Export finished, unread/ })).toBeInTheDocument()
  })

  it("marks an item read on open and filters the Unread tab", async () => {
    const user = userEvent.setup()
    const onRead = jest.fn()
    const onSelect = jest.fn()
    render(<NotificationCenter notifications={items} onRead={onRead} onSelect={onSelect} defaultOpen />)
    await user.click(screen.getByRole("button", { name: /Export finished/ }))
    expect(onRead).toHaveBeenCalledWith("2")
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "2" }))
    expect(screen.getByRole("button", { name: "Notifications, 1 unread" })).toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: /Unread/ }))
    const panel = screen.getByRole("tabpanel")
    expect(within(panel).getAllByRole("listitem")).toHaveLength(1)
  })

  it("marks everything read", async () => {
    const user = userEvent.setup()
    const onReadAll = jest.fn()
    render(<NotificationCenter notifications={items} onReadAll={onReadAll} defaultOpen />)
    await user.click(screen.getByRole("button", { name: "Mark all read" }))
    expect(onReadAll).toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Mark all read" })).toBeDisabled()
  })
})
