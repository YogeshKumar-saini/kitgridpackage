import { render, screen, within } from "@testing-library/react"
import { MemberList, type MemberListMember } from "./member-list.js"

const members: MemberListMember[] = [
  {
    id: "1",
    name: "Priya Raman",
    email: "priya@northwind.io",
    role: "Admin",
    roleTone: "accent",
    status: "active",
    self: true,
  },
  { id: "2", name: "Mateo Alvarez", email: "mateo@northwind.io", role: "Viewer", status: "invited" },
  {
    id: "3",
    name: "Hana Kobayashi",
    role: "Editor",
    status: "paused",
    statusLabel: "Paused until Nov 4",
  },
]

describe("MemberList", () => {
  it("lists people with role and written-out status, hiding the duplicate avatar name", () => {
    render(<MemberList aria-label="Team members" members={members} />)
    const list = screen.getByRole("list", { name: "Team members" })
    const [priya, mateo, hana] = within(list).getAllByRole("listitem")
    expect(priya).toHaveTextContent("Priya RamanYoupriya@northwind.ioAdminActive")
    expect(mateo).toHaveTextContent("Invited")
    expect(hana).toHaveTextContent("Paused until Nov 4")
    expect(hana).toHaveAttribute("data-status", "paused")
    expect(within(list).queryByRole("img")).toBeNull()
  })

  it("renders row actions and an empty slot", () => {
    const { rerender } = render(
      <MemberList
        members={members}
        actions={(member) => <button type="button">Remove {member.name}</button>}
      />,
    )
    expect(screen.getByRole("button", { name: "Remove Hana Kobayashi" })).toBeInTheDocument()
    rerender(<MemberList members={[]} empty="No one added yet" />)
    expect(screen.getByText("No one added yet")).toBeInTheDocument()
    expect(screen.queryByRole("list")).toBeNull()
  })
})
