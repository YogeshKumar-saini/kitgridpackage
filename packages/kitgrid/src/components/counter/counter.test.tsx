import { render, waitFor } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { Counter } from "./counter.js"

const shown = (container: HTMLElement) =>
  container.querySelector(".kg-number-ticker__count")?.textContent
const label = (container: HTMLElement) =>
  container.querySelector(".kg-number-ticker__label")?.textContent

describe("Counter", () => {
  it("lands on the first value without counting", () => {
    const { container } = render(<Counter value={1284} />)
    expect(shown(container)).toBe("1,284")
    expect(label(container)).toBe("1,284")
  })

  it("tweens to a new value and flashes in the direction of the change", async () => {
    const { container, rerender } = render(<Counter value={40} duration={40} />)
    rerender(<Counter value={55} duration={40} />)
    expect(label(container)).toBe("55")
    expect(container.firstElementChild).toHaveAttribute("data-flash", "up")
    await waitFor(() => expect(shown(container)).toBe("55"))
    rerender(<Counter value={12} duration={40} />)
    expect(container.firstElementChild).toHaveAttribute("data-flash", "down")
  })

  it("snaps under reduced motion and can skip the flash", () => {
    const { container, rerender } = render(
      <KitgridProvider reducedMotion="always">
        <Counter value={10} flash={false} format={{ style: "percent" }} />
      </KitgridProvider>,
    )
    rerender(
      <KitgridProvider reducedMotion="always">
        <Counter value={0.25} flash={false} format={{ style: "percent" }} />
      </KitgridProvider>,
    )
    expect(shown(container)).toBe("25%")
    expect(container.querySelector(".kg-counter")).not.toHaveAttribute("data-flash")
  })
})
