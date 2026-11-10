import { render, screen, within } from "@testing-library/react"
import { FeatureComparison } from "./feature-comparison.js"

const plans = [
  { id: "free", name: "Free" },
  { id: "pro", name: "Pro", highlighted: true },
]

describe("FeatureComparison", () => {
  it("builds a table with column and row headers", () => {
    render(
      <FeatureComparison
        caption="Compare plans"
        plans={plans}
        groups={[
          {
            label: "Storage",
            rows: [{ label: "Space", values: { free: "2 GB", pro: "1 TB" } }],
          },
        ]}
      />,
    )
    const table = screen.getByRole("table", { name: "Compare plans" })
    expect(within(table).getByRole("columnheader", { name: "Pro" })).toHaveAttribute(
      "data-highlighted",
    )
    expect(within(table).getByRole("rowheader", { name: "Space" })).toBeInTheDocument()
    expect(within(table).getByRole("cell", { name: "1 TB" })).toBeInTheDocument()
  })

  it("announces boolean values in words", () => {
    render(
      <FeatureComparison
        plans={plans}
        groups={[{ rows: [{ label: "SSO", values: { free: false, pro: true } }] }]}
      />,
    )
    expect(screen.getByRole("cell", { name: "Included" })).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "Not included" })).toBeInTheDocument()
  })
})
