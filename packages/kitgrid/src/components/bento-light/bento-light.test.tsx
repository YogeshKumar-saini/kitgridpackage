import { act, fireEvent, render, screen } from "@testing-library/react"
import { BentoLight, BentoLightCell } from "./bento-light.js"

const rect = (left: number, top: number, width: number, height: number) =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
  }) as DOMRect

describe("BentoLight", () => {
  it("tells every cell where the pointer is in its own box", async () => {
    render(
      <BentoLight data-testid="grid" columns={2} radius={200}>
        <BentoLightCell data-testid="a">Orders</BentoLightCell>
        <BentoLightCell data-testid="b" colSpan={2}>
          Revenue
        </BentoLightCell>
      </BentoLight>,
    )
    const grid = screen.getByTestId("grid")
    const a = screen.getByTestId("a")
    const b = screen.getByTestId("b")
    grid.getBoundingClientRect = () => rect(0, 0, 400, 300)
    a.getBoundingClientRect = () => rect(0, 0, 200, 100)
    b.getBoundingClientRect = () => rect(0, 120, 400, 100)

    expect(grid.style.getPropertyValue("--kg-bento-columns")).toBe("2")
    expect(b.style.gridColumn).toBe("span 2")

    fireEvent.pointerEnter(grid)
    fireEvent.pointerMove(grid, { clientX: 150, clientY: 60 })
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)))
    expect(grid).toHaveAttribute("data-pointer", "in")
    expect(a.style.getPropertyValue("--kg-bento-x")).toBe("150px")
    expect(a.style.getPropertyValue("--kg-bento-y")).toBe("60px")
    expect(b.style.getPropertyValue("--kg-bento-y")).toBe("-60px")
  })
})
