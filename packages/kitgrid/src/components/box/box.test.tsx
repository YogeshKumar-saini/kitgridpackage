import { render, screen } from "@testing-library/react"
import { createRef } from "react"
import { Box } from "./box.js"

describe("Box", () => {
  it("maps spacing steps to density-aware lengths and forwards the ref", () => {
    const ref = createRef<HTMLElement>()
    render(
      <Box ref={ref} padding={4} paddingX="2rem" surface="sunken" radius="lg" border>
        Body
      </Box>,
    )
    const box = screen.getByText("Body")
    expect(ref.current).toBe(box)
    expect(box).toHaveClass("kg-box")
    expect(box.style.getPropertyValue("--_p")).toBe("calc(var(--kg-space) * 4)")
    expect(box.style.getPropertyValue("--_px")).toBe("2rem")
    expect(box).toHaveAttribute("data-surface", "sunken")
    expect(box).toHaveAttribute("data-radius", "lg")
    expect(box).toHaveAttribute("data-border", "")
  })

  it("renders the requested element or merges onto its child", () => {
    const { rerender } = render(<Box as="section" aria-label="Area" />)
    expect(screen.getByRole("region", { name: "Area" }).tagName).toBe("SECTION")
    rerender(
      <Box asChild padding={2}>
        <a href="/x">Link</a>
      </Box>,
    )
    const link = screen.getByRole("link", { name: "Link" })
    expect(link).toHaveClass("kg-box")
  })
})
