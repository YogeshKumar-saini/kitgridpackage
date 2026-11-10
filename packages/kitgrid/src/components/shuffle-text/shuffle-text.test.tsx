import { render, screen, waitFor } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { ShuffleText } from "./shuffle-text.js"

describe("ShuffleText", () => {
  it("reads the text once and hides the reels", () => {
    const { container } = render(<ShuffleText as="h2">Slots</ShuffleText>)
    expect(screen.getByRole("heading", { name: "Slots" })).toBeInTheDocument()
    expect(container.querySelectorAll(".kg-shuffle-text__cell")).toHaveLength(5)
    expect(container.querySelector(".kg-shuffle-text__word")?.parentElement).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("lands every reel on its own character", () => {
    const { container } = render(<ShuffleText steps={4}>Ab</ShuffleText>)
    const reels = container.querySelectorAll(".kg-shuffle-text__reel")
    expect(reels[0]?.children).toHaveLength(5)
    expect(reels[0]?.lastElementChild).toHaveTextContent("A")
    expect(reels[1]?.lastElementChild).toHaveTextContent("b")
  })

  it("spins on mount and reports completion", async () => {
    const onComplete = jest.fn()
    const { container } = render(
      <ShuffleText trigger="mount" duration={20} stagger={0} onComplete={onComplete}>
        Go
      </ShuffleText>,
    )
    await waitFor(() => expect(onComplete).toHaveBeenCalled())
    expect(container.firstElementChild).toHaveAttribute("data-state", "spun")
  })

  it("rests on the real text for hover", () => {
    const { container } = render(<ShuffleText trigger="hover">Hi</ShuffleText>)
    expect(container.firstElementChild).toHaveAttribute("data-state", "spun")
  })

  it("shows the final text under reduced motion", () => {
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <ShuffleText>Calm</ShuffleText>
      </KitgridProvider>,
    )
    expect(container.querySelector(".kg-shuffle-text")).toHaveAttribute("data-state", "spun")
  })
})
