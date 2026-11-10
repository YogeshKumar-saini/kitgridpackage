import { act, render, waitFor } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { Particles } from "./particles.js"
import { stubGlobal, unstubAllGlobals } from "../../../test/globals.js"

const createContext = () => ({
  arcs: [] as number[][],
  clearRect: jest.fn(),
  setTransform: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  arc(x: number, y: number, r: number) {
    this.arcs.push([x, y, r])
  },
  fill: jest.fn(),
  stroke: jest.fn(),
  fillRect: jest.fn(),
  getImageData: () => ({ data: new Uint8ClampedArray([200, 100, 50, 255]) }),
  globalAlpha: 1,
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 1,
})

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

describe("Particles", () => {
  let ctx: ReturnType<typeof createContext>
  let frames: FrameRequestCallback[]
  let cancel: ReturnType<typeof jest.fn>

  beforeEach(() => {
    ctx = createContext()
    frames = []
    cancel = jest.fn()
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => ctx as unknown as CanvasRenderingContext2D,
    )
    jest.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(400)
    jest.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(300)
    stubGlobal("IntersectionObserver", VisibleObserver)
    stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback)
      return frames.length
    })
    stubGlobal("cancelAnimationFrame", cancel)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    unstubAllGlobals()
    delete document.documentElement.dataset.theme
  })

  it("renders an aria-hidden canvas layer, empty on the server", () => {
    const html = renderToString(<Particles />)
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain("<canvas")
    const { container } = render(<Particles />)
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
  })

  it("draws a single still frame under reduced motion", () => {
    render(
      <KitgridProvider reducedMotion="always">
        <Particles quantity={25} />
      </KitgridProvider>,
    )
    expect(ctx.arcs.length).toBeGreaterThanOrEqual(25)
    expect(frames).toHaveLength(0)
    expect(ctx.setTransform).toHaveBeenCalled()
  })

  it("places particles identically for the same seed", () => {
    const still = (seed: number) => {
      ctx.arcs = []
      const view = render(
        <KitgridProvider reducedMotion="always">
          <Particles quantity={10} seed={seed} />
        </KitgridProvider>,
      )
      const arcs = ctx.arcs.slice(0, 10)
      view.unmount()
      return arcs
    }
    const first = still(1)
    expect(still(1)).toEqual(first)
    expect(still(2)).not.toEqual(first)
  })

  it("animates while visible and cancels its frame on unmount", () => {
    const { unmount } = render(<Particles quantity={10} links />)
    expect(frames.length).toBeGreaterThan(0)
    act(() => frames.shift()?.(16))
    expect(ctx.stroke).toHaveBeenCalled()
    const pending = frames.length
    unmount()
    expect(cancel).toHaveBeenCalledWith(pending)
  })

  it("pauses when the tab is hidden", () => {
    render(<Particles quantity={5} />)
    const hidden = jest.spyOn(document, "hidden", "get").mockReturnValue(true)
    document.dispatchEvent(new Event("visibilitychange"))
    expect(cancel).toHaveBeenCalled()
    hidden.mockReturnValue(false)
    const before = frames.length
    document.dispatchEvent(new Event("visibilitychange"))
    expect(frames.length).toBe(before + 1)
  })

  it("re-reads its colors when the theme changes", async () => {
    render(
      <KitgridProvider reducedMotion="always">
        <Particles quantity={5} />
      </KitgridProvider>,
    )
    expect(frames).toHaveLength(0)
    document.documentElement.dataset.theme = "dark"
    await waitFor(() => expect(frames.length).toBeGreaterThan(0))
  })
})
