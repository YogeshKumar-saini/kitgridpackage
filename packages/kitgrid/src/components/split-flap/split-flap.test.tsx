import { render, screen, waitFor } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { SplitFlap } from "./split-flap.js"

const board = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.kg-split-flap__cell [data-part="bottom"]'))
    .map((node) => node.textContent)
    .join("")

describe("SplitFlap", () => {
  it("reads the value and hides the flaps", () => {
    const { container } = render(<SplitFlap value="Gate 4" />)
    expect(screen.getByText("Gate 4")).toHaveClass("kg-visually-hidden")
    expect(container.querySelector(".kg-split-flap__board")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
    expect(board(container)).toBe("GATE 4")
  })

  it("pads to a fixed length", () => {
    const { container } = render(<SplitFlap value="AB" length={4} />)
    expect(container.querySelectorAll(".kg-split-flap__cell")).toHaveLength(4)
  })

  it("flips to a new value", async () => {
    const { container, rerender } = render(<SplitFlap value="A" speed={5} stagger={0} />)
    rerender(<SplitFlap value="D" speed={5} stagger={0} />)
    await waitFor(() => expect(board(container)).toBe("D"))
  })

  it("can announce changes", () => {
    render(<SplitFlap value="ON TIME" live />)
    expect(screen.getByText("ON TIME")).toHaveAttribute("aria-live", "polite")
  })

  it("jumps straight to the value under reduced motion", () => {
    const { container, rerender } = render(
      <KitgridProvider reducedMotion="always">
        <SplitFlap value="A" />
      </KitgridProvider>,
    )
    rerender(
      <KitgridProvider reducedMotion="always">
        <SplitFlap value="Z" />
      </KitgridProvider>,
    )
    expect(board(container)).toBe("Z")
  })
})
