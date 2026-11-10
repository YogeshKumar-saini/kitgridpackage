import { render, screen } from "@testing-library/react"
import { Section } from "./section.js"

describe("Section", () => {
  it("is a named region when labelled by its heading", () => {
    render(
      <Section aria-labelledby="s-title" spacing="lg" surface="sunken" divided>
        <h2 id="s-title">Pricing</h2>
      </Section>,
    )
    const region = screen.getByRole("region", { name: "Pricing" })
    expect(region).toHaveAttribute("data-spacing", "lg")
    expect(region).toHaveAttribute("data-surface", "sunken")
    expect(region).toHaveAttribute("data-divided")
  })
})
