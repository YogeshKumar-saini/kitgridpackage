import { render, renderHook, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import type { ReactNode } from "react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { ConfettiButton, useConfetti } from "./confetti.js"
import { confetti } from "./confetti-engine.js"
import { stubGlobal, unstubAllGlobals } from "../../../test/globals.js"

const fakeContext = () => {
  let fill = "#000000"
  return {
    get fillStyle() {
      return fill
    },
    set fillStyle(value: string) {
      fill = value
    },
    globalAlpha: 1,
    setTransform: jest.fn(),
    clearRect: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn(),
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    closePath: jest.fn(),
    lineTo: jest.fn(),
    ellipse: jest.fn(),
    fill: jest.fn(),
  } as unknown as CanvasRenderingContext2D
}

const overlay = () => document.querySelector("canvas.kg-confetti")

beforeEach(() => {
  jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () => fakeContext() as never,
  )
  stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16),
  )
  stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id))
})

afterEach(() => {
  confetti.reset()
  unstubAllGlobals()
  jest.restoreAllMocks()
})

describe("confetti", () => {
  it("creates a decorative, non-interactive overlay lazily and removes it on reset", () => {
    expect(overlay()).toBeNull()
    void confetti({ particleCount: 10 })
    const canvas = overlay() as HTMLCanvasElement
    expect(canvas).toHaveAttribute("aria-hidden", "true")
    expect(canvas.style.pointerEvents).toBe("none")
    expect(canvas.style.position).toBe("fixed")
    confetti.reset()
    expect(overlay()).toBeNull()
  })

  it("removes the overlay by itself once every particle has landed", async () => {
    await confetti({ particleCount: 4, ticks: 2 })
    expect(overlay()).toBeNull()
  })

  it("is a no-op when there is nothing to draw", async () => {
    await confetti({ particleCount: 0 })
    expect(overlay()).toBeNull()
  })
})

describe("useConfetti", () => {
  it("fires from an element", async () => {
    const { result } = renderHook(() => useConfetti({ particleCount: 3, ticks: 2 }))
    const target = document.createElement("div")
    document.body.append(target)
    const done = result.current(target)
    expect(overlay()).not.toBeNull()
    await done
    target.remove()
  })

  it("does nothing under reduced motion", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <KitgridProvider reducedMotion="always">{children}</KitgridProvider>
    )
    const { result } = renderHook(() => useConfetti(), { wrapper })
    await result.current({ x: 10, y: 10 })
    expect(overlay()).toBeNull()
  })
})

describe("ConfettiButton", () => {
  it("is a regular button that bursts on click", async () => {
    const onClick = jest.fn()
    render(<ConfettiButton onClick={onClick}>Place order</ConfettiButton>)
    await userEvent.click(screen.getByRole("button", { name: "Place order" }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(overlay()).not.toBeNull()
  })

  it("skips the burst when the click handler prevents default", async () => {
    render(
      <ConfettiButton onClick={(event) => event.preventDefault()}>Pay</ConfettiButton>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Pay" }))
    expect(overlay()).toBeNull()
  })
})
