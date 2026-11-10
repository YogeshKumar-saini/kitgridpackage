import { render, screen } from "@testing-library/react"
import { Frame } from "./frame.js"

describe("Frame", () => {
  it("crops its media to a ratio and keeps the image's name", () => {
    const { container } = render(
      <Frame ratio={1} fit="contain" position="top" radius="full">
        <img src="data:," alt="Portrait" />
      </Frame>,
    )
    const frame = container.firstElementChild as HTMLElement
    expect(frame.style.aspectRatio).toMatch(/^1( \/ 1)?$/)
    expect(frame).toHaveAttribute("data-fit", "contain")
    expect(frame).toHaveAttribute("data-radius", "full")
    expect(frame.style.getPropertyValue("--_position")).toBe("top")
    expect(screen.getByRole("img", { name: "Portrait" })).toBeInTheDocument()
  })

  it("can drop the inner edge", () => {
    const { container } = render(<Frame edge={false} />)
    expect(container.firstElementChild).not.toHaveAttribute("data-edge")
  })
})
