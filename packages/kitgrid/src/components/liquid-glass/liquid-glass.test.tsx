import { fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { LiquidGlass } from "./liquid-glass.js"
import { stubGlobal, unstubAllGlobals } from "../../../test/globals.js"

const frames = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms))

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

const mockMedia = (matching: string[]) =>
  stubGlobal("matchMedia", (query: string) => ({
    matches: matching.includes(query),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }))

beforeEach(() => {
  stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16),
  )
  stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id))
  stubGlobal("IntersectionObserver", VisibleObserver)
})

afterEach(() => unstubAllGlobals())

describe("LiquidGlass", () => {
  it("renders its children in the requested element and forwards the ref", () => {
    const ref = createRef<HTMLElement>()
    render(
      <LiquidGlass as="nav" ref={ref} aria-label="Shop">
        <a href="/new">New in</a>
      </LiquidGlass>,
    )
    const nav = screen.getByRole("navigation", { name: "Shop" })
    expect(ref.current).toBe(nav)
    expect(nav).toHaveClass("kg-liquid-glass")
    expect(screen.getByRole("link", { name: "New in" })).toBeInTheDocument()
  })

  it("merges onto its child with asChild", () => {
    render(
      <LiquidGlass asChild className="glass">
        <button type="button">Add to bag</button>
      </LiquidGlass>,
    )
    const button = screen.getByRole("button", { name: "Add to bag" })
    expect(button).toHaveClass("kg-liquid-glass", "glass")
  })

  it("falls back to frosted glass where SVG backdrop filters don't render", () => {
    render(<LiquidGlass data-testid="glass">Content</LiquidGlass>)
    expect(screen.getByTestId("glass")).toHaveAttribute("data-lens", "frost")
    expect(document.querySelector("[data-kg-lens-host]")).toBeNull()
  })

  it("turns opaque when the user prefers reduced transparency", () => {
    mockMedia(["(prefers-reduced-transparency: reduce)"])
    render(<LiquidGlass data-testid="glass">Content</LiquidGlass>)
    expect(screen.getByTestId("glass")).toHaveAttribute("data-lens", "solid")
  })

  it("exposes its look as custom properties", () => {
    render(
      <LiquidGlass
        data-testid="glass"
        blur={6}
        radius={24}
        tint="rgb(0 0 0 / 0.2)"
        specular={2}
      >
        Content
      </LiquidGlass>,
    )
    const glass = screen.getByTestId("glass")
    expect(glass.style.getPropertyValue("--_blur")).toBe("6px")
    expect(glass.style.getPropertyValue("--kg-glass-radius")).toBe("24px")
    expect(glass.style.getPropertyValue("--kg-glass-tint")).toBe("rgb(0 0 0 / 0.2)")
    expect(glass.style.getPropertyValue("--_specular")).toBe("1")
  })

  it("turns the rim light toward the pointer", async () => {
    render(<LiquidGlass data-testid="glass">Content</LiquidGlass>)
    const glass = screen.getByTestId("glass")
    fireEvent.pointerMove(document, { pointerType: "mouse", clientX: 200, clientY: 0 })
    await frames(160)
    expect(glass.style.getPropertyValue("--_angle")).toMatch(/deg$/)
  })

  it("leaves the light at rest under reduced motion", async () => {
    render(
      <KitgridProvider reducedMotion="always">
        <LiquidGlass data-testid="glass">Content</LiquidGlass>
      </KitgridProvider>,
    )
    fireEvent.pointerMove(document, { pointerType: "mouse", clientX: 200, clientY: 0 })
    await frames()
    expect(screen.getByTestId("glass").style.getPropertyValue("--_angle")).toBe("")
  })
})
