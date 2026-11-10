import { render, screen } from "@testing-library/react"
import { FreeShippingProgress } from "./free-shipping-progress.js"

describe("FreeShippingProgress", () => {
  it("tells the shopper how much more to spend", () => {
    render(<FreeShippingProgress subtotal={62.6} threshold={75} />)
    expect(screen.getByText("$12.40")).toBeInTheDocument()
    expect(screen.getByText(/more for free shipping/)).toHaveTextContent(
      "Add $12.40 more for free shipping",
    )
  })

  it("exposes a named progress bar with readable value text", () => {
    render(<FreeShippingProgress subtotal={30} threshold={120} />)
    const bar = screen.getByRole("progressbar", { name: "Free shipping progress" })
    expect(bar).toHaveAttribute("aria-valuenow", "25")
    expect(bar).toHaveAttribute("aria-valuetext", "$90.00 away from free shipping")
  })

  it("celebrates once the threshold is reached", () => {
    const { container } = render(<FreeShippingProgress subtotal={80} threshold={75} />)
    expect(screen.getByText("You've unlocked free shipping")).toBeInTheDocument()
    expect(container.firstElementChild).toHaveAttribute("data-unlocked")
    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", "100")
    expect(bar).toHaveAttribute("aria-valuetext", "Free shipping unlocked")
  })

  it("never shows float noise or a negative amount", () => {
    render(<FreeShippingProgress subtotal={49.990000001} threshold={50} />)
    expect(screen.getByText("$0.01")).toBeInTheDocument()
  })

  it("formats for currency and locale and accepts label overrides", () => {
    render(
      <FreeShippingProgress
        subtotal={20}
        threshold={50}
        currency="EUR"
        locale="de-DE"
        labels={{
          remaining: (amount) => `Noch ${amount} bis zum kostenlosen Versand`,
          progress: "Versandfortschritt",
        }}
      />,
    )
    expect(
      screen.getByText("Noch 30,00 € bis zum kostenlosen Versand"),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("progressbar", { name: "Versandfortschritt" }),
    ).toBeInTheDocument()
  })

  it("announces message changes politely", () => {
    const { container } = render(<FreeShippingProgress subtotal={10} threshold={50} />)
    expect(container.querySelector("[aria-live]")).toHaveAttribute(
      "aria-live",
      "polite",
    )
  })

  it("drives the bar through a CSS variable", () => {
    const { container } = render(<FreeShippingProgress subtotal={25} threshold={100} />)
    expect(
      (container.firstElementChild as HTMLElement).style.getPropertyValue(
        "--_progress",
      ),
    ).toBe("0.25")
  })
})
