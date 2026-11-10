import { fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { Magnetic } from "./magnetic.js"
import { stubGlobal, unstubAllGlobals } from "../../../test/globals.js"

const frames = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms))

class VisibleObserver {
  constructor(private callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

beforeEach(() => {
  stubGlobal("IntersectionObserver", VisibleObserver)
  stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16),
  )
  stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id))
})

afterEach(() => unstubAllGlobals())

const place = (element: HTMLElement) => {
  element.getBoundingClientRect = () =>
    ({
      left: 100,
      top: 100,
      width: 100,
      height: 40,
      right: 200,
      bottom: 140,
    }) as DOMRect
}

describe("Magnetic", () => {
  it("renders the child itself and forwards the ref to it", () => {
    const ref = createRef<HTMLElement>()
    render(
      <Magnetic ref={ref}>
        <button type="button">Get started</button>
      </Magnetic>,
    )
    expect(ref.current).toBe(screen.getByRole("button", { name: "Get started" }))
  })

  it("pulls the child toward a nearby mouse and lets go outside the radius", async () => {
    render(
      <Magnetic radius={60} strength={0.5}>
        <button type="button">Buy</button>
      </Magnetic>,
    )
    const button = screen.getByRole("button")
    place(button)
    fireEvent.pointerMove(window, { pointerType: "mouse", clientX: 210, clientY: 120 })
    await frames()
    expect(button).toHaveAttribute("data-magnetic", "active")
    expect(button.style.translate).not.toBe("")

    fireEvent.pointerMove(window, { pointerType: "mouse", clientX: 600, clientY: 600 })
    await frames(20)
    expect(button).not.toHaveAttribute("data-magnetic")
  })

  it("ignores touch input", async () => {
    render(
      <Magnetic>
        <button type="button">Buy</button>
      </Magnetic>,
    )
    const button = screen.getByRole("button")
    place(button)
    fireEvent.pointerMove(window, { pointerType: "touch", clientX: 150, clientY: 120 })
    await frames()
    expect(button.style.translate).toBe("")
  })

  it("never moves under reduced motion", async () => {
    render(
      <KitgridProvider reducedMotion="always">
        <Magnetic>
          <button type="button">Buy</button>
        </Magnetic>
      </KitgridProvider>,
    )
    const button = screen.getByRole("button")
    place(button)
    fireEvent.pointerMove(window, { pointerType: "mouse", clientX: 150, clientY: 120 })
    await frames()
    expect(button).not.toHaveAttribute("data-magnetic")
    expect(button.style.translate).toBe("")
  })

  it("removes its window listener on unmount", () => {
    const remove = jest.spyOn(window, "removeEventListener")
    const { unmount } = render(
      <Magnetic>
        <button type="button">Buy</button>
      </Magnetic>,
    )
    unmount()
    expect(remove).toHaveBeenCalledWith("pointermove", expect.any(Function))
  })
})
