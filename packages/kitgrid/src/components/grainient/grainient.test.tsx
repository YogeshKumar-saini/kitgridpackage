import { render, screen } from "@testing-library/react"
import { Grainient } from "./grainient.js"

describe("Grainient", () => {
  it("renders an inert, aria-hidden layer on its own", () => {
    const { container } = render(<Grainient />)
    const root = container.firstElementChild
    expect(root).toHaveAttribute("aria-hidden", "true")
    expect(root).toHaveAttribute("data-animated")
    expect(container.querySelector(".kg-noise")).not.toBeNull()
  })

  it("wraps content, takes colors and can drop the grain", () => {
    const { container } = render(
      <Grainient
        colors={["oklch(0.2 0.02 50)", "oklch(0.7 0.15 50)"]}
        grain={0}
        animated={false}
      >
        <h2>Quarterly review</h2>
      </Grainient>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root).not.toHaveAttribute("aria-hidden")
    expect(root).not.toHaveAttribute("data-animated")
    expect(root.style.getPropertyValue("--kg-grainient-base")).toBe(
      "oklch(0.2 0.02 50)",
    )
    expect(
      screen.getByRole("heading", { name: "Quarterly review" }),
    ).toBeInTheDocument()
    expect(container.querySelector(".kg-noise")).toBeNull()
  })
})
