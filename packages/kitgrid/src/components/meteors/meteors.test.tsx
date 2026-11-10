import { render } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { Meteors } from "./meteors.js"

const readStylesheet = async (file: string): Promise<string> => {
  const fs = (await import("node:fs")) as {
    readFileSync: (path: string, encoding: "utf8") => string
  }
  return fs.readFileSync(`${__dirname}/${file}`, "utf8")
}

const meteorStyles = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll<HTMLElement>(".kg-meteors__meteor"),
    (meteor) => meteor.getAttribute("style"),
  )

describe("Meteors", () => {
  it("renders the requested number of meteors inside an aria-hidden layer", () => {
    const { container } = render(<Meteors count={12} />)
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveAttribute("aria-hidden", "true")
    expect(container.querySelectorAll(".kg-meteors__meteor")).toHaveLength(12)
  })

  it("is reproducible for a seed and changes with it", () => {
    const first = render(<Meteors seed={3} />)
    const a = meteorStyles(first.container)
    first.unmount()
    const second = render(<Meteors seed={3} />)
    expect(meteorStyles(second.container)).toEqual(a)
    second.unmount()
    const third = render(<Meteors seed={4} />)
    expect(meteorStyles(third.container)).not.toEqual(a)
  })

  it("matches server markup exactly, so hydration never warns", () => {
    expect(renderToString(<Meteors seed={9} count={30} />)).toBe(
      renderToString(<Meteors seed={9} count={30} />),
    )
  })

  it("keeps timings within the requested ranges", () => {
    const { container } = render(<Meteors count={40} duration={[2, 4]} maxDelay={1} />)
    for (const meteor of container.querySelectorAll<HTMLElement>(
      ".kg-meteors__meteor",
    )) {
      const flight = Number.parseFloat(meteor.style.animationDuration)
      const delay = Number.parseFloat(meteor.style.animationDelay)
      expect(flight).toBeGreaterThanOrEqual(2)
      expect(flight).toBeLessThanOrEqual(4)
      expect(delay).toBeGreaterThanOrEqual(0)
      expect(delay).toBeLessThanOrEqual(1)
    }
  })

  it("passes angle, color and tail to CSS", () => {
    const { container } = render(<Meteors angle={100} color="gold" tailLength={40} />)
    const root = container.firstElementChild as HTMLElement
    expect(root.style.getPropertyValue("--kg-meteors-angle")).toBe("100deg")
    expect(root.style.getPropertyValue("--kg-meteors-color")).toBe("gold")
    expect(root.style.getPropertyValue("--kg-meteors-tail")).toBe("40px")
  })

  it("freezes at mid-flight under both reduced-motion signals", async () => {
    const css = await readStylesheet("./meteors.css")
    expect(css).toContain("translateX(calc(var(--_travel) * 0.5))")
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*{\s*\.kg-meteors__meteor/)
    expect(css).toContain('[data-kg-motion="reduce"] .kg-meteors__meteor')
  })
})
