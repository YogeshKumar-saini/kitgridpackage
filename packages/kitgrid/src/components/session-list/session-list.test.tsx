import { render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { SessionList, type SessionListItem } from "./session-list.js"

const now = new Date(2026, 9, 24, 15)
const sessions: SessionListItem[] = [
  { id: "a", title: "Returns by city", updatedAt: new Date(2026, 9, 23, 10) },
  { id: "b", title: "Weekly revenue", updatedAt: new Date(2026, 9, 24, 9) },
  { id: "c", title: "Margin check", updatedAt: new Date(2026, 9, 24, 12) },
]

describe("SessionList", () => {
  it("groups by day, newest first, and marks the active chat", () => {
    render(<SessionList sessions={sessions} activeId="b" now={now} locale="en-US" />)
    expect(screen.getByRole("navigation", { name: "Chats" })).toBeInTheDocument()
    const today = screen.getByRole("group", { name: "Today" })
    const titles = within(today)
      .getAllByRole("button")
      .map((button) => button.textContent)
    expect(titles).toEqual(["Margin check", "Weekly revenue"])
    expect(screen.getByRole("group", { name: "Yesterday" })).toHaveTextContent(
      "Returns by city",
    )
    expect(screen.getByRole("button", { name: "Weekly revenue" })).toHaveAttribute(
      "aria-current",
      "true",
    )
  })

  it("selects, starts new chats and moves with arrow keys", async () => {
    const onSelect = jest.fn()
    const onNew = jest.fn()
    render(
      <SessionList sessions={sessions} onSelect={onSelect} onNew={onNew} now={now} />,
    )
    await userEvent.click(screen.getByRole("button", { name: "New chat" }))
    expect(onNew).toHaveBeenCalledTimes(1)
    const first = screen.getByRole("button", { name: "Margin check" })
    first.focus()
    await userEvent.keyboard("{ArrowDown}")
    expect(screen.getByRole("button", { name: "Weekly revenue" })).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}{Enter}")
    expect(onSelect).toHaveBeenCalledWith("a")
  })

  it("renders actions and an empty state", () => {
    const { rerender } = render(
      <SessionList
        sessions={sessions.slice(0, 1)}
        now={now}
        actions={(session) => <button type="button">Delete {session.title}</button>}
      />,
    )
    expect(
      screen.getByRole("button", { name: "Delete Returns by city" }),
    ).toBeInTheDocument()
    rerender(<SessionList sessions={[]} empty="Nothing yet" />)
    expect(screen.getByText("Nothing yet")).toBeInTheDocument()
  })
})
