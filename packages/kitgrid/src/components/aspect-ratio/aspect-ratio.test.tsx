import { render } from "@testing-library/react"
import { AspectRatio } from "./aspect-ratio.js"

describe("AspectRatio", () => {
  it("applies the ratio as an inline aspect ratio", () => {
    const { container } = render(
      <AspectRatio ratio={4 / 3}>
        <div />
      </AspectRatio>,
    )
    const box = container.firstElementChild as HTMLElement
    expect(box).toHaveClass("kg-aspect-ratio")
    expect(box.style.aspectRatio).toContain("1.33")
  })

  it("falls back to a square for an invalid ratio", () => {
    const { container } = render(<AspectRatio ratio={0} />)
    expect((container.firstElementChild as HTMLElement).style.aspectRatio).toMatch(/^1( \/ 1)?$/)
  })
})
