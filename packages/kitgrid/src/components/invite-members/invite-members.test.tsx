import { render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { InviteMembers } from "./invite-members.js"

describe("InviteMembers", () => {
  it("turns typed addresses into chips and flags invalid ones", async () => {
    const user = userEvent.setup()
    render(<InviteMembers />)
    const input = screen.getByRole("textbox", { name: "Email addresses" })
    await user.type(input, "priya@northwind.io,oops ")
    const chips = within(screen.getByRole("list", { name: "Email addresses" })).getAllByRole("listitem")
    expect(chips).toHaveLength(2)
    expect(chips[1]).toHaveTextContent("oops, invalid")
    await user.keyboard("{Backspace}")
    expect(screen.getAllByRole("listitem")).toHaveLength(1)
    await user.click(screen.getByRole("button", { name: "Remove priya@northwind.io" }))
    expect(screen.queryAllByRole("listitem")).toHaveLength(0)
    expect(screen.getByRole("button", { name: "Send invites" })).toBeDisabled()
  })

  it("sends valid addresses with the role and announces it", async () => {
    const user = userEvent.setup()
    const onInvite = jest.fn()
    render(<InviteMembers onInvite={onInvite} defaultRole="admin" />)
    await user.type(screen.getByRole("textbox"), "mateo@northwind.io{Enter}hana@northwind.io")
    await user.click(screen.getByRole("button", { name: "Send invites" }))
    expect(onInvite).toHaveBeenCalledWith(["mateo@northwind.io", "hana@northwind.io"], "admin")
    expect(screen.getByRole("status")).toHaveTextContent("2 invites sent")
  })
})
