import { render, screen } from "@testing-library/react"
import { FormattedNumber } from "./formatted-number.js"

describe("FormattedNumber", () => {
  it("keeps the raw value on the data element", () => {
    render(<FormattedNumber value={1234567.891} maximumFractionDigits={1} />)
    const el = screen.getByText("1,234,567.9")
    expect(el.tagName).toBe("DATA")
    expect(el).toHaveAttribute("value", "1234567.891")
  })

  it("formats compact, percent, currency and bytes", () => {
    render(
      <>
        <FormattedNumber value={48200} format="compact" />
        <FormattedNumber value={0.425} format="percent" />
        <FormattedNumber value={42.5} format="percent" percentOfHundred />
        <FormattedNumber value={1299} format="currency" currency="EUR" />
        <FormattedNumber value={1536} format="bytes" />
      </>,
    )
    expect(screen.getByText("48.2K")).toBeInTheDocument()
    expect(screen.getAllByText("42.5%")).toHaveLength(2)
    expect(screen.getByText("€1,299.00")).toBeInTheDocument()
    expect(screen.getByText("1.5 kB")).toBeInTheDocument()
  })

  it("marks the sign for signed tone and falls back on NaN", () => {
    render(
      <>
        <FormattedNumber value={-3.2} tone="signed" signDisplay="always" />
        <FormattedNumber value={Number.NaN} fallback="n/a" />
      </>,
    )
    expect(screen.getByText("-3.2")).toHaveAttribute("data-sign", "negative")
    expect(screen.getByText("n/a")).not.toHaveAttribute("value")
  })
})
