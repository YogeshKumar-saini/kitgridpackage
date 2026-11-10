import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { isFrameInSet, ProductSpin, type ProductSpinHotspot } from "./product-spin.js"
import { stubGlobal, unstubAllGlobals } from "../../../test/globals.js"

const frames = Array.from({ length: 36 }, (_, i) => `/spin/${i}.jpg`)

const hotspots: ProductSpinHotspot[] = [
  {
    id: "heel",
    label: "Air heel",
    content: "Visible Air unit.",
    frames: { from: 34, to: 2 },
    x: 20,
    y: 50,
  },
  { id: "toe", label: "Toe cap", frames: [9, 10], x: 70, y: 60 },
]

beforeEach(() => {
  stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16),
  )
  stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id))
})

afterEach(() => unstubAllGlobals())

const slider = () => screen.getByRole("slider")

describe("isFrameInSet", () => {
  it("handles ranges, wrapping ranges and lists", () => {
    expect(isFrameInSet({ from: 2, to: 5 }, 4)).toBe(true)
    expect(isFrameInSet({ from: 2, to: 5 }, 6)).toBe(false)
    expect(isFrameInSet({ from: 34, to: 2 }, 35)).toBe(true)
    expect(isFrameInSet({ from: 34, to: 2 }, 1)).toBe(true)
    expect(isFrameInSet({ from: 34, to: 2 }, 20)).toBe(false)
    expect(isFrameInSet([9, 10], 10)).toBe(true)
  })
})

describe("ProductSpin", () => {
  it("shows a neutral placeholder instead of a broken image when there are no frames", () => {
    const { container } = render(<ProductSpin alt="Speaker" />)
    expect(container.querySelector("img")).toBeNull()
    expect(container.querySelector(".kg-product-spin__placeholder")).not.toBeNull()
  })

  it("renders the first frame as a named slider in degrees", () => {
    const { container } = render(
      <ProductSpin frames={frames} alt="Runner" initialFrame={9} />,
    )
    expect(slider()).toHaveAccessibleName("Runner, 360 degree view")
    expect(slider()).toHaveAttribute("aria-valuenow", "90")
    expect(slider()).toHaveAttribute("aria-valuetext", "Rotated 90 degrees")
    expect(container.querySelector("img")).toHaveAttribute("src", "/spin/9.jpg")
  })

  it("builds frames from src and frameCount", () => {
    const { container } = render(
      <ProductSpin src={(i) => `/shoe-${i + 1}.jpg`} frameCount={12} alt="Shoe" />,
    )
    expect(container.querySelector("img")).toHaveAttribute("src", "/shoe-1.jpg")
  })

  it("steps with the arrow keys, wraps around and jumps with Home and End", async () => {
    const user = userEvent.setup()
    const onFrameChange = jest.fn()
    render(<ProductSpin frames={frames} alt="Runner" onFrameChange={onFrameChange} />)
    slider().focus()
    await user.keyboard("{ArrowRight}")
    expect(slider()).toHaveAttribute("aria-valuenow", "10")
    expect(onFrameChange).toHaveBeenLastCalledWith(1, 10)
    await user.keyboard("{ArrowLeft}{ArrowLeft}")
    expect(slider()).toHaveAttribute("aria-valuenow", "350")
    await user.keyboard("{Home}")
    expect(slider()).toHaveAttribute("aria-valuenow", "0")
    await user.keyboard("{End}")
    expect(slider()).toHaveAttribute("aria-valuenow", "350")
    await user.keyboard("{PageUp}")
    expect(slider()).toHaveAttribute("aria-valuetext", "Rotated 40 degrees")
  })

  it("clamps instead of wrapping when loop is off", async () => {
    const user = userEvent.setup()
    render(<ProductSpin frames={frames} alt="Runner" loop={false} />)
    slider().focus()
    await user.keyboard("{ArrowLeft}")
    expect(slider()).toHaveAttribute("aria-valuenow", "0")
  })

  it("turns with a horizontal drag", () => {
    render(<ProductSpin frames={frames} alt="Runner" inertia={false} />)
    Object.defineProperty(slider(), "clientWidth", { configurable: true, value: 360 })
    fireEvent.pointerDown(slider(), { pointerId: 1, clientX: 200, button: 0 })
    fireEvent.pointerMove(slider(), { pointerId: 1, clientX: 170 })
    // 36 frames across 360px: dragging 30px left turns three frames forward.
    expect(slider()).toHaveAttribute("aria-valuenow", "30")
    fireEvent.pointerUp(slider(), { pointerId: 1, clientX: 170 })
  })

  it("shows hotspots only on their frames and opens their card", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <ProductSpin frames={frames} alt="Runner" hotspots={hotspots} />,
    )
    const pins = container.querySelectorAll(".kg-product-spin__pin")
    expect(pins[0]).toHaveAttribute("data-visible")
    expect(pins[1]).not.toHaveAttribute("data-visible")

    const heel = screen.getByRole("button", { name: "Air heel" })
    await user.click(heel)
    expect(heel).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("group", { name: "Air heel" })).toHaveTextContent(
      "Visible Air unit.",
    )

    await user.keyboard("{Escape}")
    expect(heel).toHaveAttribute("aria-expanded", "false")
    expect(heel).toHaveFocus()

    slider().focus()
    await user.keyboard("{End}{Home}")
    for (let i = 0; i < 9; i++) await user.keyboard("{ArrowRight}")
    expect(pins[0]).not.toHaveAttribute("data-visible")
    expect(pins[1]).toHaveAttribute("data-visible")
  })

  it("labels the controls and toggles play and zoom", async () => {
    const user = userEvent.setup()
    render(<ProductSpin frames={frames} alt="Runner" autoplay />)
    const pause = screen.getByRole("button", { name: "Pause rotation" })
    await user.click(pause)
    expect(screen.getByRole("button", { name: "Play rotation" })).toBeInTheDocument()

    const zoom = screen.getByRole("button", { name: "Zoom in" })
    await user.click(zoom)
    expect(screen.getByRole("button", { name: "Zoom out" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )

    const next = screen.getByRole("button", { name: "Rotate right" })
    expect(next).toBeEnabled()
  })

  it("drops the play control and autoplay under reduced motion", () => {
    render(
      <KitgridProvider reducedMotion="always">
        <ProductSpin frames={frames} alt="Runner" autoplay />
      </KitgridProvider>,
    )
    expect(screen.queryByRole("button", { name: /rotation/ })).toBeNull()
    expect(slider()).toBeInTheDocument()
  })

  it("preloads every frame and reports when it is ready", async () => {
    stubGlobal(
      "IntersectionObserver",
      class {
        constructor(private readonly callback: IntersectionObserverCallback) {}
        observe(target: Element) {
          this.callback(
            [{ isIntersecting: true, target } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          )
        }
        unobserve() {}
        disconnect() {}
      },
    )
    const requested: string[] = []
    stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        decoding = "auto"
        setAttribute() {}
        set src(value: string) {
          requested.push(value)
          queueMicrotask(() => this.onload?.())
        }
      },
    )
    const { container } = render(<ProductSpin frames={frames} alt="Runner" />)
    const root = container.firstElementChild as HTMLElement
    await waitFor(() => expect(root).toHaveAttribute("data-status", "ready"))
    expect(new Set(requested).size).toBe(frames.length)
    // Coarse frames come first so a rough turn works early.
    expect(requested.slice(0, 3)).toEqual([
      "/spin/0.jpg",
      "/spin/16.jpg",
      "/spin/32.jpg",
    ])
    expect(root).not.toHaveAttribute("aria-busy")
  })

  it("forwards its ref and merges className", () => {
    const ref = { current: null as HTMLDivElement | null }
    act(() => {
      render(<ProductSpin ref={ref} frames={frames} alt="Runner" className="hero" />)
    })
    expect(ref.current).toHaveClass("kg-product-spin", "hero")
  })
})
