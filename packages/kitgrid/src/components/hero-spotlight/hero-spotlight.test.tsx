import { render, screen } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { HeroSpotlight } from "./hero-spotlight.js"

const readStylesheet = async (file: string): Promise<string> => {
  const fs = (await import("node:fs")) as {
    readFileSync: (path: string, encoding: "utf8") => string
  }
  return fs.readFileSync(`${__dirname}/${file}`, "utf8")
}

describe("HeroSpotlight", () => {
  it("renders an aria-hidden beam and core", () => {
    const { container } = render(<HeroSpotlight />)
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveAttribute("aria-hidden", "true")
    expect(root).toHaveAttribute("data-origin", "top-left")
    expect(root.querySelector(".kg-hero-spotlight__beam")).toBeInTheDocument()
    expect(root.querySelector(".kg-hero-spotlight__core")).toBeInTheDocument()
  })

  it("drops the core when fill is false and accepts custom colors", () => {
    const { container } = render(<HeroSpotlight fill={false} color="white" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.querySelector(".kg-hero-spotlight__core")).toBeNull()
    expect(root.style.getPropertyValue("--kg-hero-spotlight-color")).toBe("white")
  })

  it("points straight down from the top unless an angle is given", () => {
    const { container, rerender } = render(<HeroSpotlight origin="top" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.style.getPropertyValue("--kg-hero-spotlight-angle")).toBe("90deg")
    rerender(<HeroSpotlight origin="top-right" angle={40} delay={1} duration={3} />)
    expect(root.style.getPropertyValue("--kg-hero-spotlight-angle")).toBe("40deg")
    expect(root.style.getPropertyValue("--kg-hero-spotlight-delay")).toBe("1s")
    expect(root.style.getPropertyValue("--kg-hero-spotlight-duration")).toBe("3s")
  })

  it("wraps hero content", () => {
    render(
      <HeroSpotlight>
        <h1>Launch day</h1>
      </HeroSpotlight>,
    )
    expect(screen.getByRole("heading", { name: "Launch day" })).toBeInTheDocument()
  })

  it("is deterministic on the server", () => {
    expect(renderToString(<HeroSpotlight />)).toBe(renderToString(<HeroSpotlight />))
  })

  it("rests on the final frame, so reduced motion only removes the sweep", async () => {
    const css = await readStylesheet("./hero-spotlight.css")
    expect(css).toContain("transform: var(--_rest)")
    expect(css).toContain("prefers-reduced-motion: reduce")
    expect(css).toContain('[data-kg-motion="reduce"] .kg-hero-spotlight__layer > *')
  })
})
