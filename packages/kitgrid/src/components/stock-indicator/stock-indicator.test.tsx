import { render, screen } from "@testing-library/react"
import { getStockStatus, StockIndicator } from "./stock-indicator.js"

describe("StockIndicator", () => {
  it("derives status from quantity and threshold", () => {
    expect(getStockStatus(0)).toBe("out-of-stock")
    expect(getStockStatus(3)).toBe("low-stock")
    expect(getStockStatus(5)).toBe("low-stock")
    expect(getStockStatus(6)).toBe("in-stock")
    expect(getStockStatus(8, 10)).toBe("low-stock")
  })

  it("writes scarcity in words", () => {
    const { container } = render(<StockIndicator quantity={3} />)
    expect(screen.getByText("Only 3 left")).toBeInTheDocument()
    expect(container.firstElementChild).toHaveAttribute("data-status", "low-stock")
  })

  it("covers every status with default copy", () => {
    const { rerender } = render(<StockIndicator quantity={40} />)
    expect(screen.getByText("In stock, ready to ship")).toBeInTheDocument()
    rerender(<StockIndicator quantity={0} />)
    expect(screen.getByText("Out of stock")).toBeInTheDocument()
    rerender(<StockIndicator status="backorder" />)
    expect(screen.getByText("Ships in 2-3 weeks")).toBeInTheDocument()
    rerender(<StockIndicator status="preorder" />)
    expect(screen.getByText("Pre-order now")).toBeInTheDocument()
    rerender(<StockIndicator status="low-stock" />)
    expect(screen.getByText("Low stock")).toBeInTheDocument()
  })

  it("lets an explicit status win over quantity", () => {
    render(<StockIndicator quantity={0} status="preorder" />)
    expect(screen.getByText("Pre-order now")).toBeInTheDocument()
  })

  it("accepts label overrides and custom content", () => {
    const { rerender } = render(
      <StockIndicator
        quantity={2}
        labels={{ lowStock: (n) => `Nur noch ${n} verfügbar` }}
      />,
    )
    expect(screen.getByText("Nur noch 2 verfügbar")).toBeInTheDocument()
    rerender(<StockIndicator quantity={20}>Ships tomorrow</StockIndicator>)
    expect(screen.getByText("Ships tomorrow")).toBeInTheDocument()
  })

  it("draws a decorative scarcity bar scaled to the remaining stock", () => {
    const { container } = render(<StockIndicator quantity={3} showBar barMax={12} />)
    const root = container.firstElementChild as HTMLElement
    expect(root.style.getPropertyValue("--_level")).toBe("0.25")
    expect(container.querySelector(".kg-stock-indicator__bar")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })
})
