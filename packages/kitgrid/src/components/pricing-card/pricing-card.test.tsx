import { render, screen } from "@testing-library/react"
import { PricingCard } from "./pricing-card.js"

describe("PricingCard", () => {
  it("renders the tier as an article with a heading and formatted price", () => {
    render(<PricingCard name="Pro" price={24} period="/ mo" />)
    expect(screen.getByRole("article")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: "Pro" })).toBeInTheDocument()
    expect(screen.getByText("$")).toBeInTheDocument()
    expect(screen.getByText("/ mo")).toBeInTheDocument()
  })

  it("announces included and excluded features", () => {
    render(
      <PricingCard
        name="Starter"
        price={0}
        features={["3 projects", { label: "Priority support", included: false }]}
      />,
    )
    const items = screen.getAllByRole("listitem")
    expect(items[0]).toHaveTextContent("Included: 3 projects")
    expect(items[1]).toHaveTextContent("Not included: Priority support")
    expect(items[1]).toHaveAttribute("data-included", "false")
  })

  it("shows the badge only when highlighted and supports custom prices", () => {
    const { rerender, container } = render(
      <PricingCard name="Team" price={null} customPrice="Custom" badge="Popular" />,
    )
    expect(screen.getByText("Custom")).toBeInTheDocument()
    expect(screen.queryByText("Popular")).toBeNull()
    rerender(<PricingCard name="Team" price={49} badge="Popular" highlighted />)
    expect(screen.getByText("Popular")).toBeInTheDocument()
    expect(container.firstElementChild).toHaveAttribute("data-highlighted")
  })
})
