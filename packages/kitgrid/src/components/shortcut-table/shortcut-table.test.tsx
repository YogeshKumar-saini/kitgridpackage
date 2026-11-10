import { render, screen, within } from "@testing-library/react"
import { ShortcutTable } from "./shortcut-table.js"

describe("ShortcutTable", () => {
  it("groups shortcuts into captioned tables with row headers", () => {
    render(
      <ShortcutTable
        shortcuts={[
          { group: "General", description: "Open command palette", keys: ["mod", "k"] },
          { group: "Navigation", description: "Next page", keys: [["j"], ["down"]] },
          {
            group: "General",
            description: "Toggle theme",
            keys: ["mod", "shift", "l"],
          },
        ]}
      />,
    )
    const general = screen.getByRole("table", { name: "General" })
    const rows = within(general).getAllByRole("row")
    expect(rows).toHaveLength(2)
    expect(
      within(general).getByRole("rowheader", { name: "Toggle theme" }),
    ).toBeInTheDocument()
    const navigation = screen.getByRole("table", { name: "Navigation" })
    expect(navigation).toHaveTextContent("or")
    expect(navigation).toHaveTextContent("Down arrow")
  })
})
