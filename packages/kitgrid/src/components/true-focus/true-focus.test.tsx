import { fireEvent, render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { TrueFocus } from "./true-focus.js"

const words = (container: HTMLElement) =>
  Array.from(container.querySelectorAll(".kg-true-focus__word"))

describe("TrueFocus", () => {
  it("reads the whole sentence and hides the blurred copy", () => {
    const { container } = render(<TrueFocus as="h2">See what matters</TrueFocus>)
    expect(screen.getByRole("heading", { name: "See what matters" })).toBeInTheDocument()
    expect(container.querySelector(".kg-true-focus__text")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
    expect(words(container)).toHaveLength(3)
  })

  it("focuses the first word, then the hovered one", () => {
    const { container } = render(<TrueFocus mode="hover">One two three</TrueFocus>)
    expect(words(container)[0]).toHaveAttribute("data-active")
    fireEvent.pointerEnter(words(container)[2] as Element)
    expect(words(container)[2]).toHaveAttribute("data-active")
    expect(words(container)[0]).not.toHaveAttribute("data-active")
  })

  it("keeps every word sharp under reduced motion", () => {
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <TrueFocus>All clear</TrueFocus>
      </KitgridProvider>,
    )
    expect(container.querySelector(".kg-true-focus")).toHaveAttribute("data-reduced")
  })
})
