import { fireEvent, render, screen } from "@testing-library/react"
import { useRef } from "react"
import { ScrollArea } from "./scroll-area.js"

const size = (element: HTMLElement, values: Record<string, number>) => {
  for (const [key, value] of Object.entries(values))
    Object.defineProperty(element, key, { configurable: true, value })
}

describe("ScrollArea", () => {
  it("names the viewport as a region and hides the decorative bars", () => {
    const { container } = render(
      <ScrollArea aria-label="Release notes">
        <p>Text</p>
      </ScrollArea>,
    )
    expect(screen.getByRole("region", { name: "Release notes" })).toBeInTheDocument()
    expect(container.querySelector(".kg-scroll-area__bar")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("sizes and moves the thumb from the viewport's scroll position", () => {
    const Example = () => {
      const viewport = useRef<HTMLDivElement>(null)
      return (
        <ScrollArea aria-label="Log" viewportRef={viewport} type="always">
          <div style={{ height: 1000 }}>Long</div>
        </ScrollArea>
      )
    }
    const { container } = render(<Example />)
    const viewport = screen.getByRole("region", { name: "Log" })
    const bar = container.querySelector<HTMLElement>(".kg-scroll-area__bar")!
    const thumb = container.querySelector<HTMLElement>(".kg-scroll-area__thumb")!
    size(viewport, { clientHeight: 200, scrollHeight: 1000, scrollTop: 400 })
    size(bar, { clientHeight: 200 })
    fireEvent.scroll(viewport)
    expect(bar).toHaveAttribute("data-hidden", "false")
    expect(thumb.style.height).toBe("40px")
    expect(thumb.style.transform).toContain("80px")
    expect(viewport).toHaveAttribute("tabindex", "0")
  })
})
