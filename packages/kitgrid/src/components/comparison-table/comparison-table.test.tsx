import { render, screen, within } from "@testing-library/react"
import { ComparisonTable } from "./comparison-table.js"

const columns = [
  { key: "free", label: "Free" },
  { key: "pro", label: "Pro", meta: "$12", highlight: true },
]
const rows = [
  { feature: "Projects", group: "Core", values: { free: "3", pro: "Unlimited" } },
  { feature: "SSO", group: "Security", values: { free: false, pro: true } },
]

describe("ComparisonTable", () => {
  it("names the table by its caption and scopes headers", () => {
    render(<ComparisonTable caption="Plans" columns={columns} rows={rows} />)
    const table = screen.getByRole("table", { name: "Plans" })
    expect(within(table).getByRole("columnheader", { name: /Pro/ })).toHaveAttribute(
      "data-highlight",
      "true",
    )
    expect(within(table).getByRole("rowheader", { name: "SSO" })).toBeInTheDocument()
  })

  it("reads booleans as words", () => {
    render(<ComparisonTable caption="Plans" columns={columns} rows={rows} />)
    const row = screen.getByRole("row", { name: /SSO/ })
    expect(within(row).getByText("Not included")).toBeInTheDocument()
    expect(within(row).getByText("Included")).toBeInTheDocument()
  })

  it("renders one subheading per group", () => {
    render(<ComparisonTable caption="Plans" columns={columns} rows={rows} />)
    expect(screen.getByRole("columnheader", { name: "Core" })).toHaveAttribute("colspan", "3")
    expect(screen.getByRole("columnheader", { name: "Security" })).toBeInTheDocument()
  })
})
