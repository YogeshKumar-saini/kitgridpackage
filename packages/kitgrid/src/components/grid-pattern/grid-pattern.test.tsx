import { fireEvent, render } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { GridPattern } from "./grid-pattern.js"

const readStylesheet = async (file: string): Promise<string> => {
  const fs = (await import("node:fs")) as {
    readFileSync: (path: string, encoding: "utf8") => string
  }
  return fs.readFileSync(`${__dirname}/${file}`, "utf8")
}

const cellPositions = (container: HTMLElement) =>
  Array.from(container.querySelectorAll(".kg-grid-pattern__cell"), (cell) => [
    cell.getAttribute("x"),
    cell.getAttribute("y"),
  ])

describe("GridPattern", () => {
  it("renders an aria-hidden SVG grid with a uniquely referenced pattern", () => {
    const { container } = render(<GridPattern size={32} strokeWidth={2} dash="4 2" />)
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveAttribute("aria-hidden", "true")
    const pattern = root.querySelector("pattern")
    expect(pattern).toHaveAttribute("width", "32")
    expect(root.querySelector("rect")).toHaveAttribute("fill", `url(#${pattern?.id})`)
    expect(root.querySelector("pattern path")).toHaveAttribute(
      "stroke-dasharray",
      "4 2",
    )
  })

  it("fills the requested squares inside the grid lines", () => {
    const { container } = render(
      <GridPattern
        size={40}
        squares={[
          [1, 2],
          [3, 0],
        ]}
      />,
    )
    const squares = container.querySelectorAll(".kg-grid-pattern__squares rect")
    expect(squares).toHaveLength(2)
    expect(squares[0]).toHaveAttribute("x", "41")
    expect(squares[0]).toHaveAttribute("y", "81")
    expect(squares[0]).toHaveAttribute("width", "39")
  })

  it("seeds animated cells identically on server and client", () => {
    const html = renderToString(<GridPattern animated seed={4} cells={8} />)
    expect(renderToString(<GridPattern animated seed={4} cells={8} />)).toBe(html)
    const { container } = render(<GridPattern animated seed={4} cells={8} />)
    expect(container.querySelectorAll(".kg-grid-pattern__cell")).toHaveLength(8)
    const other = render(<GridPattern animated seed={5} cells={8} />)
    expect(cellPositions(other.container)).not.toEqual(cellPositions(container))
  })

  it("moves a cell to a fresh spot each time its flash restarts", () => {
    const { container } = render(<GridPattern animated cells={1} />)
    const cell = container.querySelector(".kg-grid-pattern__cell") as SVGRectElement
    const before = [cell.getAttribute("x"), cell.getAttribute("y")]
    fireEvent.animationIteration(cell)
    fireEvent.animationIteration(cell)
    expect([cell.getAttribute("x"), cell.getAttribute("y")]).not.toEqual(before)
  })

  it("renders the floor variant as a plane and skips flashing cells", () => {
    const { container } = render(<GridPattern variant="floor" animated />)
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveAttribute("data-variant", "floor")
    expect(root.querySelector(".kg-grid-pattern__plane svg")).toBeInTheDocument()
    expect(root.querySelector(".kg-grid-pattern__cell")).toBeNull()
  })

  it("disconnects its resize observer on unmount", () => {
    const disconnect = jest.fn()
    const original = globalThis.ResizeObserver
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect = disconnect
    } as unknown as typeof ResizeObserver
    const { unmount } = render(<GridPattern animated />)
    unmount()
    expect(disconnect).toHaveBeenCalled()
    globalThis.ResizeObserver = original
  })

  it("stops flashing and scrolling under both reduced-motion signals", async () => {
    const css = await readStylesheet("./grid-pattern.css")
    expect(css).toContain("prefers-reduced-motion: reduce")
    expect(css).toContain(
      '[data-kg-motion="reduce"] .kg-grid-pattern .kg-grid-pattern__cell',
    )
  })
})
