import { render, screen } from "@testing-library/react"
import { PageHeader } from "./page-header.js"

describe("PageHeader", () => {
  it("renders the title as the page heading with its slots", () => {
    render(
      <PageHeader
        title="Store performance"
        description="Revenue, orders and returns across every channel."
        breadcrumb={<nav aria-label="Breadcrumb">Reports</nav>}
        actions={<button type="button">Export</button>}
        meta="Data through Oct 23"
      />,
    )
    expect(
      screen.getByRole("heading", { level: 1, name: "Store performance" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument()
    expect(screen.getByText("Data through Oct 23")).toBeInTheDocument()
  })

  it("honours the heading level and can drop the rule", () => {
    const { container } = render(<PageHeader title="Members" titleAs="h2" rule={false} />)
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument()
    expect(container.firstElementChild).not.toHaveAttribute("data-rule")
  })
})
