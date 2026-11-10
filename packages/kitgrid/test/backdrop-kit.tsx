import { render, screen } from "@testing-library/react"
import { type ComponentType, createRef, type ReactNode, type Ref } from "react"
import { renderToString } from "react-dom/server"
import { KitgridProvider } from "../src/provider/kitgrid-provider.js"
import { stubGlobal, unstubAllGlobals } from "./globals.js"

type Backdrop = ComponentType<{
  ref?: Ref<HTMLDivElement>
  className?: string
  children?: ReactNode
}>

/** Reads `src/components/<folder>/<folder>.css`. */
export const readStylesheet = async (folder: string): Promise<string> => {
  const fs = (await import("node:fs")) as {
    readFileSync: (path: string, encoding: "utf8") => string
  }
  return fs.readFileSync(`${__dirname}/../src/components/${folder}/${folder}.css`, "utf8")
}

/** The shared backdrop contract: inert layer alone, transparent wrapper with children. */
export const describeBackdrop = (
  name: string,
  Component: Backdrop,
  rootClass: string,
  /** Folder whose stylesheet must stop its loops under reduced motion. */
  stylesheet?: string,
) => {
  describe(`${name} backdrop contract`, () => {
    it("renders an inert, aria-hidden layer on its own", () => {
      const ref = createRef<HTMLDivElement>()
      const { container } = render(<Component ref={ref} className="extra" />)
      const root = container.firstElementChild as HTMLElement
      expect(ref.current).toBe(root)
      expect(root).toHaveClass(rootClass, "extra")
      expect(root).toHaveAttribute("aria-hidden", "true")
      expect(root).not.toHaveAttribute("data-wrapper")
    })

    it("paints behind children without hiding them", () => {
      const { container } = render(
        <Component>
          <h2>Northwind Atlas</h2>
        </Component>,
      )
      const root = container.firstElementChild as HTMLElement
      expect(root).toHaveAttribute("data-wrapper")
      expect(root).not.toHaveAttribute("aria-hidden")
      expect(screen.getByRole("heading", { name: "Northwind Atlas" })).toBeInTheDocument()
    })

    it("renders identical markup on every server pass", () => {
      expect(renderToString(<Component />)).toBe(renderToString(<Component />))
    })

    if (stylesheet) {
      it("stops its loops under both reduced-motion signals", async () => {
        const css = await readStylesheet(stylesheet)
        expect(css).toContain("prefers-reduced-motion: reduce")
        expect(css).toContain('[data-kg-motion="reduce"]')
      })
    }
  })
}

const createContext = () => {
  const calls: string[] = []
  const target: Record<string, unknown> = {
    calls,
    canvas: { width: 0, height: 0 },
    getImageData: () => ({ data: new Uint8ClampedArray([200, 100, 50, 255]) }),
    createImageData: (w: number, h: number) => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(Math.max(1, w * h * 4)),
    }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    measureText: () => ({ width: 0 }),
  }
  return new Proxy(target, {
    get(obj, key: string) {
      if (key in obj) return obj[key]
      const fn = (..._args: unknown[]) => {
        calls.push(key)
      }
      obj[key] = fn
      return fn
    },
    set(obj, key: string, value) {
      obj[key] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D & { calls: string[] }
}

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

/** The canvas engine contract: still frame under reduced motion, a live loop otherwise. */
export const describeCanvasBackdrop = (name: string, Component: Backdrop) => {
  describe(`${name} canvas`, () => {
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
    })

    it("ships an empty canvas from the server", () => {
      expect(renderToString(<Component />)).toContain("<canvas")
    })

    it("draws one still frame and schedules nothing under reduced motion", () => {
      render(
        <KitgridProvider reducedMotion="always">
          <Component />
        </KitgridProvider>,
      )
      expect(frames).toHaveLength(0)
      expect(ctx.calls.length).toBeGreaterThan(0)
    })

    it("animates while visible and cancels its frame on unmount", () => {
      const { unmount } = render(<Component />)
      expect(frames.length).toBeGreaterThan(0)
      frames.shift()?.(16)
      frames.shift()?.(32)
      unmount()
      expect(cancel).toHaveBeenCalled()
    })
  })
}
