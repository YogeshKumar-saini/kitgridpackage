import { render, screen, waitFor } from "@testing-library/react"
import { Lens } from "./lens.js"

describe("Lens", () => {
  it("exposes the content once and hides the magnified clone", () => {
    const { container } = render(
      <Lens>
        <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="Walnut desk" />
      </Lens>,
    )
    expect(screen.getAllByRole("img", { name: "Walnut desk" })).toHaveLength(1)
    const clone = container.querySelector(".kg-lens__zoom")
    expect(clone).toHaveAttribute("aria-hidden", "true")
    expect(clone).toHaveAttribute("inert")
  })

  it("passes zoom and size to CSS", () => {
    const { container } = render(<Lens zoom={3} size={120} />)
    const root = container.firstElementChild as HTMLElement
    expect(root.style.getPropertyValue("--_zoom")).toBe("3")
    expect(root.style.getPropertyValue("--_size")).toBe("120px")
  })

  it("strips ids and names from the magnified clone", async () => {
    const { container } = render(
      <Lens>
        <label htmlFor="qty">Quantity</label>
        <input id="qty" name="qty" defaultValue="1" />
      </Lens>,
    )
    await waitFor(() => {
      expect(container.querySelectorAll("#qty")).toHaveLength(1)
    })
    expect(container.querySelectorAll('[name="qty"]')).toHaveLength(1)
    expect(container.querySelector(".kg-lens > input")).toHaveAttribute("id", "qty")
  })
})
