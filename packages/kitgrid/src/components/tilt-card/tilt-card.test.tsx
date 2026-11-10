import { fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { TiltCard } from "./tilt-card.js"
import { stubGlobal, unstubAllGlobals } from "../../../test/globals.js"

const frames = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms))

// jsdom stamps rAF callbacks from another clock than performance.now(), stalling springs.
beforeEach(() => {
  stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16),
  )
  stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id))
})

afterEach(() => unstubAllGlobals())

describe("TiltCard", () => {
  it("renders children, a decorative glare and forwards its ref", () => {
    const ref = createRef<HTMLDivElement>()
    const { container } = render(
      <TiltCard ref={ref} data-testid="card">
        <h3>Sneaker</h3>
      </TiltCard>,
    )
    expect(ref.current).toBe(screen.getByTestId("card"))
    expect(screen.getByRole("heading", { name: "Sneaker" })).toBeInTheDocument()
    const glare = container.querySelector(".kg-tilt-card__glare")
    expect(glare).toHaveAttribute("aria-hidden", "true")
  })

  it("omits the glare when glare is false", () => {
    const { container } = render(<TiltCard glare={false}>Card</TiltCard>)
    expect(container.querySelector(".kg-tilt-card__glare")).toBeNull()
  })

  it("tilts toward a mouse pointer and springs back on leave", async () => {
    render(<TiltCard data-testid="card">Card</TiltCard>)
    const card = screen.getByTestId("card")
    fireEvent.pointerMove(card, { pointerType: "mouse", clientX: 10, clientY: 10 })
    await frames()
    expect(card).toHaveAttribute("data-active")
    expect(card.style.transform).toContain("rotateX")
    fireEvent.pointerLeave(card)
    expect(card).not.toHaveAttribute("data-active")
  })

  it("ignores touch unless touch is enabled", async () => {
    render(<TiltCard data-testid="card">Card</TiltCard>)
    const card = screen.getByTestId("card")
    fireEvent.pointerMove(card, { pointerType: "touch", clientX: 10, clientY: 10 })
    await frames()
    expect(card.style.transform).toBe("")
  })

  it("stays flat under reduced motion", async () => {
    render(
      <KitgridProvider reducedMotion="always">
        <TiltCard data-testid="card">Card</TiltCard>
      </KitgridProvider>,
    )
    const card = screen.getByTestId("card")
    expect(card).toHaveAttribute("data-disabled")
    fireEvent.pointerMove(card, { pointerType: "mouse", clientX: 10, clientY: 10 })
    await frames()
    expect(card.style.transform).toBe("")
  })

  it("mirrors data-depth into a CSS variable for parallax layers", () => {
    render(
      <TiltCard>
        <img alt="Shoe" data-depth="40" />
      </TiltCard>,
    )
    expect(screen.getByAltText("Shoe").style.getPropertyValue("--_depth")).toBe("40")
  })
})
