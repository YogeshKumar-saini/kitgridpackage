import { render, screen } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { Noise } from "./noise.js"

const readStylesheet = async (file: string): Promise<string> => {
  const fs = (await import("node:fs")) as {
    readFileSync: (path: string, encoding: "utf8") => string
  }
  return fs.readFileSync(`${__dirname}/${file}`, "utf8")
}

describe("Noise", () => {
  it("renders an aria-hidden grain layer from an inline SVG turbulence tile", () => {
    const { container } = render(<Noise baseFrequency={0.65} octaves={3} size={128} />)
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveClass("kg-noise")
    expect(root).toHaveAttribute("aria-hidden", "true")
    const grain = root.querySelector<HTMLElement>(".kg-noise__grain")
    const image = decodeURIComponent(grain?.style.backgroundImage ?? "")
    expect(image).toContain("data:image/svg+xml")
    expect(image).toContain("baseFrequency='0.65'")
    expect(image).toContain("numOctaves='3'")
    expect(grain?.style.backgroundSize).toBe("128px 128px")
  })

  it("exposes opacity and blend mode as custom properties", () => {
    const { container } = render(<Noise opacity={0.3} blendMode="soft-light" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.style.getPropertyValue("--kg-noise-opacity")).toBe("0.3")
    expect(root.style.getPropertyValue("--kg-noise-blend")).toBe("soft-light")
  })

  it("lays grain over children while keeping them accessible", () => {
    const { container } = render(
      <Noise>
        <a href="/pricing">Pricing</a>
      </Noise>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(screen.getByRole("link", { name: "Pricing" })).toBeInTheDocument()
    expect(root.lastElementChild).toHaveClass("kg-noise__layer")
  })

  it("only flickers when asked, and is static under reduced motion", async () => {
    const { container, rerender } = render(<Noise />)
    expect(container.firstElementChild).not.toHaveAttribute("data-animated")
    rerender(<Noise animated />)
    expect(container.firstElementChild).toHaveAttribute("data-animated")
    const css = await readStylesheet("./noise.css")
    expect(css).toContain("prefers-reduced-motion: reduce")
    expect(css).toContain('[data-kg-motion="reduce"] .kg-noise[data-animated]')
  })

  it("is deterministic on the server", () => {
    expect(renderToString(<Noise animated />)).toBe(renderToString(<Noise animated />))
  })
})
