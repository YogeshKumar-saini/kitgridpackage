import { render, screen, within } from "@testing-library/react"
import { PresenceAvatars } from "./presence-avatars.js"

const people = [
  { id: "1", name: "Priya Raman", location: "Revenue" },
  { id: "2", name: "Mateo Alvarez", state: "idle" as const },
  { id: "3", name: "Hana Kobayashi", state: "away" as const },
  { id: "4", name: "Arjun Mehta" },
]

describe("PresenceAvatars", () => {
  it("names the group and writes each person's state", () => {
    render(<PresenceAvatars people={people} max={2} />)
    const group = screen.getByRole("group", { name: "4 people here" })
    const items = within(group).getAllByRole("listitem")
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent("Priya Raman, active, Revenue")
    expect(items[1]).toHaveTextContent("Mateo Alvarez, idle")
    expect(items[2]).toHaveTextContent("and 2 more: Hana Kobayashi, Arjun Mehta")
  })
})
