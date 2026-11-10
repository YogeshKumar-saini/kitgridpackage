import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ProductTabs } from "./product-tabs.js"

const sections = [
  { id: "details", label: "Details", content: <p>100% linen</p> },
  { id: "shipping", label: "Shipping", content: <p>Ships in 2 days</p> },
  { id: "returns", label: "Returns", content: <p>30-day returns</p> },
]

describe("ProductTabs", () => {
  it("renders an APG tab set", async () => {
    render(<ProductTabs sections={sections} />)
    expect(screen.getByRole("tablist", { name: "Product information" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tabpanel")).toHaveTextContent("100% linen")
    await userEvent.click(screen.getByRole("tab", { name: "Returns" }))
    expect(screen.getByRole("tabpanel")).toHaveTextContent("30-day returns")
  })

  it("renders native disclosures in accordion layout", () => {
    const { container } = render(
      <ProductTabs sections={sections} layout="accordion" defaultSection="shipping" />,
    )
    const details = container.querySelectorAll("details")
    expect(details).toHaveLength(3)
    expect(details[1]).toHaveAttribute("open")
    expect(details[0]).not.toHaveAttribute("open")
  })
})
