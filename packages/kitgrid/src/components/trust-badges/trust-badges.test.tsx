import { render, screen } from "@testing-library/react"
import { TrustBadges } from "./trust-badges.js"

describe("TrustBadges", () => {
  it("renders presets with default labels and custom items", () => {
    render(
      <TrustBadges
        items={["secure", { preset: "returns", detail: "30 days" }, { label: "Carbon neutral" }]}
      />,
    )
    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent("Secure checkout")
    expect(items[1]).toHaveTextContent("Free returns30 days")
    expect(items[2]).toHaveTextContent("Carbon neutral")
  })

  it("lets preset labels be translated", () => {
    render(<TrustBadges items={["shipping"]} presetLabels={{ shipping: "Envío rápido" }} />)
    expect(screen.getByText("Envío rápido")).toBeInTheDocument()
  })
})
