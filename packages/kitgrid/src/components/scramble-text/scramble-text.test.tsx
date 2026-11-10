import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { ScrambleText } from "./scramble-text.js"

const scrambled = (container: HTMLElement) =>
  container.querySelectorAll(".kg-scramble-text__char[data-scrambled]").length

describe("ScrambleText", () => {
  it("names the element with the real text and hides the noise", () => {
    const { container } = render(<ScrambleText as="h2">Access granted</ScrambleText>)
    expect(screen.getByRole("heading", { name: "Access granted" })).toBeInTheDocument()
    expect(container.querySelector(".kg-scramble-text__text")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("keeps every original character in place while it scrambles", () => {
    const { container } = render(
      <ScrambleText trigger="mount">Hello there</ScrambleText>,
    )
    expect(scrambled(container)).toBe(10)
    expect(container.querySelector(".kg-scramble-text__text")).toHaveTextContent(
      "Hello there",
    )
    const glyph = container
      .querySelector(".kg-scramble-text__char")
      ?.getAttribute("data-glyph")
    expect(glyph).toMatch(/^.$/u)
  })

  it("decodes back to the text and reports completion", async () => {
    const onComplete = jest.fn()
    const { container } = render(
      <ScrambleText trigger="mount" duration={80} onComplete={onComplete}>
        Done
      </ScrambleText>,
    )
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    expect(scrambled(container)).toBe(0)
  })

  it("pre-scrambles while waiting to scroll into view", () => {
    const { container } = render(<ScrambleText>Soon</ScrambleText>)
    expect(scrambled(container)).toBe(4)
  })

  it("re-scrambles on hover and on focus within", () => {
    const { container } = render(
      <a href="#x">
        <ScrambleText trigger="hover">Docs</ScrambleText>
      </a>,
    )
    const root = container.querySelector(".kg-scramble-text") as HTMLElement
    expect(scrambled(container)).toBe(0)
    fireEvent.pointerEnter(root)
    expect(scrambled(container)).toBe(4)
  })

  it("starts on focus for keyboard users", () => {
    const { container } = render(<ScrambleText trigger="hover">Menu</ScrambleText>)
    fireEvent.focus(container.querySelector(".kg-scramble-text") as HTMLElement)
    expect(scrambled(container)).toBe(4)
  })

  it("never scrambles under reduced motion", () => {
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <ScrambleText trigger="mount">Plain</ScrambleText>
      </KitgridProvider>,
    )
    expect(scrambled(container)).toBe(0)
  })

  it("can switch to the monospace font", () => {
    const { container } = render(<ScrambleText monospace>0xFF</ScrambleText>)
    expect(container.firstElementChild).toHaveAttribute("data-monospace")
  })
})
