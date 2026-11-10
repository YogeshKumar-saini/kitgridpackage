import { render, screen } from "@testing-library/react"
import { createRef } from "react"
import { renderToString } from "react-dom/server"
import { Aurora } from "./aurora.js"
import { createRandom } from "./internal/random.js"

const readStylesheet = async (file: string): Promise<string> => {
  const fs = (await import("node:fs")) as {
    readFileSync: (path: string, encoding: "utf8") => string
  }
  return fs.readFileSync(`${__dirname}/${file}`, "utf8")
}

describe("Aurora", () => {
  it("renders an inert, aria-hidden full-bleed layer on its own", () => {
    const ref = createRef<HTMLDivElement>()
    const { container } = render(<Aurora ref={ref} />)
    const root = container.firstElementChild as HTMLElement
    expect(ref.current).toBe(root)
    expect(root).toHaveClass("kg-aurora")
    expect(root).toHaveAttribute("aria-hidden", "true")
    expect(root).toHaveAttribute("data-mask", "radial")
    expect(root.querySelector(".kg-aurora__layer")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("paints behind children without hiding them from assistive technology", () => {
    const { container } = render(
      <Aurora>
        <h1>Ship faster</h1>
      </Aurora>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveAttribute("data-wrapper")
    expect(root).not.toHaveAttribute("aria-hidden")
    expect(screen.getByRole("heading", { name: "Ship faster" })).toBeInTheDocument()
  })

  it("maps props to clamped custom properties and keeps consumer styles", () => {
    const { container } = render(
      <Aurora
        colors={["red", "lime"]}
        intensity={4}
        blur={20}
        speed={2}
        style={{ top: 4 }}
      />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.getPropertyValue("--kg-aurora-color-1")).toBe("red")
    expect(root.style.getPropertyValue("--kg-aurora-color-2")).toBe("lime")
    expect(root.style.getPropertyValue("--kg-aurora-color-3")).toBe("")
    expect(root.style.getPropertyValue("--kg-aurora-intensity")).toBe("1")
    expect(root.style.getPropertyValue("--kg-aurora-blur")).toBe("20px")
    expect(root.style.top).toBe("4px")
  })

  it("renders identical markup on every server pass", () => {
    expect(renderToString(<Aurora />)).toBe(renderToString(<Aurora />))
  })

  it("stops every loop under both reduced-motion signals", async () => {
    const css = await readStylesheet("./aurora.css")
    expect(css).toMatch(
      /prefers-reduced-motion: reduce\)\s*{\s*\.kg-aurora__layer > \*/,
    )
    expect(css).toContain('[data-kg-motion="reduce"] .kg-aurora__layer > *')
  })
})

describe("createRandom", () => {
  it("is reproducible per seed and stays within [0, 1)", () => {
    const a = createRandom(42)
    const b = createRandom(42)
    const c = createRandom(43)
    const first = Array.from({ length: 50 }, a)
    expect(Array.from({ length: 50 }, b)).toEqual(first)
    expect(Array.from({ length: 50 }, c)).not.toEqual(first)
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true)
  })
})
