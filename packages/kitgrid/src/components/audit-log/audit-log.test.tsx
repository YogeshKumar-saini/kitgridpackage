import { render, screen, within } from "@testing-library/react"
import { AuditLog } from "./audit-log.js"

describe("AuditLog", () => {
  it("groups entries under named day regions as sentences", () => {
    render(
      <AuditLog
        groups={[
          {
            id: "today",
            label: "Today",
            entries: [
              { id: "1", actor: "Priya Raman", action: "invited", target: "hana@northwind.io", time: "14:32", tone: "create" },
              { id: "2", actor: "Mateo Alvarez", action: "rotated the API key", time: "09:10", meta: "10.0.4.12", tone: "security" },
            ],
          },
          { id: "yday", label: "Yesterday", entries: [{ id: "3", actor: "Priya Raman", action: "deleted", target: "Q2 forecast", time: "17:45", tone: "delete" }] },
        ]}
      />,
    )
    const today = screen.getByRole("region", { name: "Today" })
    const items = within(today).getAllByRole("listitem")
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent("Priya Raman invited hana@northwind.io14:32")
    expect(items[1]).toHaveAttribute("data-tone", "security")
    expect(screen.getByRole("heading", { name: "Yesterday", level: 3 })).toBeInTheDocument()
  })
})
