import { render, screen, within } from "@testing-library/react"
import { ChangelogList } from "./changelog-list.js"

describe("ChangelogList", () => {
  it("renders entries as headed articles with dates and change kinds", () => {
    render(
      <ChangelogList
        aria-label="Changelog"
        entries={[
          { id: "1", date: "Oct 21", dateTime: "2026-10-21", version: "v4.2", title: "Scheduled exports", kinds: ["new"], href: "#exports" },
          { id: "2", date: "Oct 14", title: "Faster filters", kinds: ["improved", "fixed"] },
        ]}
      />,
    )
    const list = screen.getByRole("list", { name: "Changelog" })
    expect(within(list).getAllByRole("article")).toHaveLength(2)
    expect(screen.getByRole("heading", { name: "Scheduled exports" })).toContainElement(
      screen.getByRole("link", { name: "Scheduled exports" }),
    )
    expect(screen.getByText("Oct 21")).toHaveAttribute("datetime", "2026-10-21")
    expect(screen.getByText("Improved")).toHaveAttribute("data-kind", "improved")
  })
})
