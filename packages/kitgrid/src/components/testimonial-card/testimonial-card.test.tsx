import { render, screen } from "@testing-library/react"
import { TestimonialCard } from "./testimonial-card.js"

describe("TestimonialCard", () => {
  it("uses figure, blockquote and figcaption", () => {
    const { container } = render(
      <TestimonialCard quote="Setup took ten minutes." author="Maya Chen" byline="Founder, Nook" />,
    )
    expect(screen.getByRole("figure")).toBeInTheDocument()
    expect(container.querySelector("blockquote")).toHaveTextContent("Setup took ten minutes.")
    expect(container.querySelector("figcaption")).toHaveTextContent("Maya Chen")
    expect(screen.getByText("MC")).toHaveAttribute("aria-hidden", "true")
  })

  it("names the star rating", () => {
    render(<TestimonialCard quote="Great." author="Leo Park" rating={4.6} />)
    expect(screen.getByRole("img", { name: "Rated 5 out of 5" })).toBeInTheDocument()
  })
})
