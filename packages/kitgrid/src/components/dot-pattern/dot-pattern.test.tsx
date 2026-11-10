import { fireEvent, render, screen } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { DotPattern } from "./dot-pattern.js"
import { stubGlobal, unstubAllGlobals } from "../../../test/globals.js"

describe("DotPattern", () => {
  beforeEach(() => {
    stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    stubGlobal("cancelAnimationFrame", jest.fn())
  })

  afterEach(() => {
    unstubAllGlobals()
  })

  it("renders an aria-hidden SVG dot grid", () => {
    const { container } = render(<DotPattern gap={24} radius={1.5} />)
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveAttribute("aria-hidden", "true")
    expect(root.querySelector("pattern")).toHaveAttribute("width", "24")
    const dot = root.querySelector("circle")
    expect(dot).toHaveAttribute("cx", "12")
    expect(dot).toHaveAttribute("r", "1.5")
    expect(root.querySelector(".kg-dot-pattern__glow")).toBeNull()
  })

  it("keeps dots inside their cell", () => {
    const { container } = render(<DotPattern gap={6} radius={10} />)
    expect(container.querySelector("circle")).toHaveAttribute("r", "3")
  })

  it("lights dots around the pointer on the element it fills", () => {
    const { container } = render(
      <section data-testid="hero">
        <DotPattern glow />
      </section>,
    )
    const hero = screen.getByTestId("hero")
    const glow = container.querySelector(".kg-dot-pattern__glow") as HTMLElement
    expect(glow).not.toHaveAttribute("data-active")

    fireEvent.pointerMove(hero, { clientX: 30, clientY: 40 })
    expect(hero.style.getPropertyValue("--kg-pointer-x")).toBe("30px")
    expect(glow).toHaveAttribute("data-active")

    fireEvent.pointerLeave(hero)
    expect(glow).not.toHaveAttribute("data-active")
  })

  it("tracks itself when it wraps content", () => {
    const { container } = render(
      <DotPattern glow>
        <button type="button">Start</button>
      </DotPattern>,
    )
    const root = container.firstElementChild as HTMLElement
    fireEvent.pointerMove(screen.getByRole("button", { name: "Start" }), {
      clientX: 5,
      clientY: 6,
    })
    expect(root.style.getPropertyValue("--kg-pointer-y")).toBe("6px")
  })

  it("stops listening on unmount", () => {
    const { unmount } = render(
      <section data-testid="hero">
        <DotPattern glow />
      </section>,
    )
    const hero = screen.getByTestId("hero")
    const remove = jest.spyOn(hero, "removeEventListener")
    unmount()
    expect(remove).toHaveBeenCalledWith("pointermove", expect.any(Function))
  })

  it("is deterministic on the server", () => {
    expect(renderToString(<DotPattern glow />)).toBe(
      renderToString(<DotPattern glow />),
    )
  })
})
