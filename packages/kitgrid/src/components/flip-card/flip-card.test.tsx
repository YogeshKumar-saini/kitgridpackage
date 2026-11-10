import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { FlipCard } from "./flip-card.js"

const faces = {
  front: <p>Front side</p>,
  back: (
    <p>
      Back side <a href="#details">Details</a>
    </p>
  ),
}

const faceOf = (text: string) =>
  screen.getByText(text).closest(".kg-flip-card__face") as HTMLElement

describe("FlipCard", () => {
  it("toggles with an aria-pressed button and keeps the hidden face inert", async () => {
    const onFlippedChange = jest.fn()
    render(<FlipCard {...faces} onFlippedChange={onFlippedChange} />)
    const toggle = screen.getByRole("button", { name: "Flip card" })
    expect(toggle).toHaveAttribute("aria-pressed", "false")
    expect(faceOf("Back side")).toHaveAttribute("aria-hidden", "true")
    expect(faceOf("Back side").inert).toBe(true)

    await userEvent.tab()
    expect(toggle).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    expect(toggle).toHaveAttribute("aria-pressed", "true")
    expect(onFlippedChange).toHaveBeenCalledWith(true)
    expect(faceOf("Front side").inert).toBe(true)
    expect(faceOf("Back side")).not.toHaveAttribute("aria-hidden")
    expect(screen.getByRole("link", { name: "Details" })).toBeInTheDocument()
  })

  it("flips when the surface is clicked, but not when a control on a face is", async () => {
    const { container } = render(<FlipCard {...faces} defaultFlipped />)
    const root = container.querySelector(".kg-flip-card") as HTMLElement
    await userEvent.click(screen.getByRole("link", { name: "Details" }))
    expect(root).toHaveAttribute("data-state", "back")
    await userEvent.click(screen.getByText(/Back side/))
    expect(root).toHaveAttribute("data-state", "front")
  })

  it("supports controlled state", async () => {
    const Controlled = () => {
      const [flipped, setFlipped] = useState(false)
      return (
        <>
          <FlipCard {...faces} trigger="manual" flipped={flipped} axis="x" />
          <button type="button" onClick={() => setFlipped((v) => !v)}>
            Outside
          </button>
        </>
      )
    }
    const { container } = render(<Controlled />)
    const root = container.querySelector(".kg-flip-card") as HTMLElement
    expect(root).toHaveAttribute("data-axis", "x")
    expect(screen.queryByRole("button", { name: "Flip card" })).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Outside" }))
    expect(root).toHaveAttribute("data-state", "back")
  })

  it("flips on mouse hover in hover mode", () => {
    const { container } = render(<FlipCard {...faces} trigger="hover" />)
    const root = container.querySelector(".kg-flip-card") as HTMLElement
    fireEvent.pointerEnter(root, { pointerType: "mouse" })
    expect(root).toHaveAttribute("data-state", "back")
    fireEvent.pointerLeave(root, { pointerType: "mouse" })
    expect(root).toHaveAttribute("data-state", "front")
  })

  it("switches to a crossfade under reduced motion", () => {
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <FlipCard {...faces} />
      </KitgridProvider>,
    )
    expect(container.querySelector(".kg-flip-card")).toHaveAttribute(
      "data-motion",
      "reduce",
    )
  })
})
