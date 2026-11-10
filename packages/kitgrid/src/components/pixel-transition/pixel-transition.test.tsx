import { act, fireEvent, render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { PixelTransition } from "./pixel-transition.js"

describe("PixelTransition", () => {
  it("hides the inactive face and the pixel grid from assistive tech", () => {
    const { container } = render(<PixelTransition first="Front" second="Back" gridSize={4} />)
    expect(screen.getByText("Back")).toHaveAttribute("aria-hidden", "true")
    expect(screen.getByText("Front")).not.toHaveAttribute("aria-hidden")
    expect(container.querySelectorAll(".kg-pixel-transition__pixel")).toHaveLength(16)
  })

  it("covers, then swaps faces on hover", () => {
    jest.useFakeTimers()
    const { container } = render(<PixelTransition first="Front" second="Back" duration={200} />)
    const root = container.firstElementChild as HTMLElement
    fireEvent.pointerEnter(root, { pointerType: "mouse" })
    expect(root).toHaveAttribute("data-phase", "cover")
    act(() => {
      jest.advanceTimersByTime(120)
    })
    expect(root).toHaveAttribute("data-state", "second")
    jest.useRealTimers()
  })

  it("swaps instantly under reduced motion", () => {
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <PixelTransition first="Front" second="Back" />
      </KitgridProvider>,
    )
    const root = container.querySelector(".kg-pixel-transition") as HTMLElement
    fireEvent.focus(root)
    expect(root).toHaveAttribute("data-state", "second")
    expect(root).toHaveAttribute("data-phase", "idle")
  })
})
