import { render } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { BackgroundBeams } from "./background-beams.js"

const readStylesheet = async (file: string): Promise<string> => {
  const fs = (await import("node:fs")) as {
    readFileSync: (path: string, encoding: "utf8") => string
  }
  return fs.readFileSync(`${__dirname}/${file}`, "utf8")
}

const paths = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll(".kg-background-beams__lights path"),
    (path) => path.getAttribute("d"),
  )

describe("BackgroundBeams", () => {
  it("renders a track and a light per beam inside an aria-hidden layer", () => {
    const { container } = render(<BackgroundBeams count={10} />)
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveAttribute("aria-hidden", "true")
    expect(
      container.querySelectorAll(".kg-background-beams__tracks path"),
    ).toHaveLength(10)
    const lights = container.querySelectorAll(".kg-background-beams__lights path")
    expect(lights).toHaveLength(10)
    expect(lights[0]).toHaveAttribute("pathLength", "1")
  })

  it("strokes lights with a gradient unique to each instance", () => {
    const { container } = render(
      <>
        <BackgroundBeams />
        <BackgroundBeams />
      </>,
    )
    const ids = Array.from(
      container.querySelectorAll("linearGradient"),
      (node) => node.id,
    )
    expect(new Set(ids).size).toBe(2)
    const group = container.querySelector(".kg-background-beams__lights")
    expect(group).toHaveAttribute("stroke", `url(#${ids[0]})`)
  })

  it("is reproducible for a seed and matches server markup", () => {
    const first = render(<BackgroundBeams seed={2} />)
    const a = paths(first.container)
    first.unmount()
    const second = render(<BackgroundBeams seed={2} />)
    expect(paths(second.container)).toEqual(a)
    second.unmount()
    const third = render(<BackgroundBeams seed={8} />)
    expect(paths(third.container)).not.toEqual(a)
    expect(renderToString(<BackgroundBeams seed={2} />)).toBe(
      renderToString(<BackgroundBeams seed={2} />),
    )
  })

  it("passes custom colors to the gradient", () => {
    const { container } = render(<BackgroundBeams colors={["red", "blue", "green"]} />)
    const root = container.firstElementChild as HTMLElement
    expect(root.style.getPropertyValue("--kg-beams-color-1")).toBe("red")
    expect(root.style.getPropertyValue("--kg-beams-color-3")).toBe("green")
  })

  it("rests each light at a seeded point under reduced motion", async () => {
    const { container } = render(<BackgroundBeams count={5} />)
    for (const light of container.querySelectorAll<SVGElement>(
      ".kg-background-beams__lights path",
    )) {
      const rest = Number(light.style.getPropertyValue("--_rest"))
      expect(rest).toBeLessThanOrEqual(0)
      expect(rest).toBeGreaterThanOrEqual(-0.8)
    }
    const css = await readStylesheet("./background-beams.css")
    expect(css).toContain("prefers-reduced-motion: reduce")
    expect(css).toContain(
      '[data-kg-motion="reduce"] .kg-background-beams__lights path',
    )
  })
})
