import { render, screen } from "@testing-library/react"
import { createRef } from "react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { Marquee } from "./marquee.js"

const logos = (
  <>
    <a href="#acme">Acme</a>
    <a href="#globex">Globex</a>
  </>
)

describe("Marquee", () => {
  it("exposes the content once and hides the duplicates from assistive tech", () => {
    const { container } = render(<Marquee aria-label="Customers">{logos}</Marquee>)
    expect(screen.getAllByRole("link", { name: "Acme" })).toHaveLength(1)
    const groups = container.querySelectorAll(".kg-marquee__group")
    expect(groups.length).toBeGreaterThanOrEqual(2)
    for (const duplicate of Array.from(groups).slice(1)) {
      expect(duplicate).toHaveAttribute("aria-hidden", "true")
      expect((duplicate as HTMLElement).inert).toBe(true)
    }
  })

  it("honours repeat, orientation, gap and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>()
    const { container } = render(
      <Marquee ref={ref} repeat={4} orientation="vertical" gap={24} data-testid="m">
        {logos}
      </Marquee>,
    )
    const root = screen.getByTestId("m")
    expect(ref.current).toBe(root)
    expect(root).toHaveAttribute("data-orientation", "vertical")
    expect(root.style.getPropertyValue("--kg-marquee-gap")).toBe("24px")
    expect(container.querySelectorAll(".kg-marquee__group")).toHaveLength(4)
  })

  it("renders a single focusable, scrollable strip under reduced motion", () => {
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <Marquee aria-label="Customers">{logos}</Marquee>
      </KitgridProvider>,
    )
    const root = container.querySelector(".kg-marquee") as HTMLElement
    expect(root).toHaveAttribute("data-reduced")
    expect(root).toHaveAttribute("tabindex", "0")
    expect(container.querySelectorAll(".kg-marquee__group")).toHaveLength(1)
  })

  it("unmounts cleanly", () => {
    const { unmount } = render(<Marquee>{logos}</Marquee>)
    expect(() => unmount()).not.toThrow()
  })
})
