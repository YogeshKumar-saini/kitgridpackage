import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { InboxList, type InboxListItem } from "./inbox-list.js"

const items: InboxListItem[] = [
  { id: "a", from: "Priya Raman", subject: "Churn model is ready", unread: true, time: "9:41" },
  { id: "b", from: "Mateo Alvarez", subject: "Weekly KPIs", time: "Tue" },
  { id: "c", from: "Hana Kobayashi", subject: "Access request", unread: true, time: "Mon" },
]

describe("InboxList", () => {
  it("is a listbox of options that announces unread rows", () => {
    render(<InboxList aria-label="Inbox" items={items} />)
    expect(screen.getByRole("listbox", { name: "Inbox" })).toBeInTheDocument()
    const options = screen.getAllByRole("option")
    expect(options).toHaveLength(3)
    expect(options[0]).toHaveTextContent("Unread: Churn model is ready")
    expect(options[0]).toHaveAttribute("tabindex", "0")
    expect(options[1]).toHaveAttribute("tabindex", "-1")
  })

  it("moves with arrows and selects with Enter or click", async () => {
    const user = userEvent.setup()
    const onValueChange = jest.fn()
    render(<InboxList aria-label="Inbox" items={items} onValueChange={onValueChange} />)
    await user.tab()
    await user.keyboard("{ArrowDown}")
    const options = screen.getAllByRole("option")
    expect(options[1]).toHaveFocus()
    await user.keyboard("{Enter}")
    expect(onValueChange).toHaveBeenCalledWith("b")
    expect(options[1]).toHaveAttribute("aria-selected", "true")
    await user.click(options[2] as HTMLElement)
    expect(onValueChange).toHaveBeenLastCalledWith("c")
  })
})
