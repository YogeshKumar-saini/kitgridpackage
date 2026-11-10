import { render, screen } from "@testing-library/react"
import { Masonry } from "./masonry.js"

describe("Masonry", () => {
  afterEach(() => {
    delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth
    delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight
  })

  it("keeps DOM order of children", () => {
    render(
      <Masonry>
        <button type="button">One</button>
        <button type="button">Two</button>
        {null}
        <button type="button">Three</button>
      </Masonry>,
    )
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "One",
      "Two",
      "Three",
    ])
  })

  it("places each item in the shortest column", () => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 420,
    })
    const heights = [100, 40, 30, 50]
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get(this: HTMLElement) {
        const index = Array.from(this.parentElement?.children ?? []).indexOf(this)
        return heights[index] ?? 0
      },
    })
    const { container } = render(
      <Masonry columns={2} gap={20}>
        {heights.map((h) => (
          <div key={h}>{h}</div>
        ))}
      </Masonry>,
    )
    const cells = Array.from(container.querySelectorAll<HTMLElement>(".kg-masonry__item"))
    expect(cells[0]?.style.transform).toBe("translate(0px, 0px)")
    expect(cells[1]?.style.transform).toBe("translate(220px, 0px)")
    expect(cells[2]?.style.transform).toBe("translate(220px, 60px)")
    expect(cells[3]?.style.transform).toBe("translate(220px, 110px)")
    expect(cells[0]?.style.width).toBe("200px")
    expect(container.firstElementChild).toHaveAttribute("data-ready")
  })
})
