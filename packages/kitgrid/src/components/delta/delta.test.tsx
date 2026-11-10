import { render } from "@testing-library/react"
import { Delta } from "./delta.js"

const root = (container: HTMLElement) => container.firstElementChild as HTMLElement

describe("Delta", () => {
  it("reads the direction in words and tones a rise as good", () => {
    const { container } = render(<Delta value={12.34} caption="vs last week" />)
    expect(root(container)).toHaveTextContent("up 12.3%vs last week")
    expect(root(container)).toHaveAttribute("data-direction", "up")
    expect(root(container)).toHaveAttribute("data-tone", "positive")
  })

  it("treats a rise as bad when inverted", () => {
    const { container } = render(<Delta value={4} invert />)
    expect(root(container)).toHaveAttribute("data-tone", "negative")
  })

  it("keeps a neutral verdict while still showing direction", () => {
    const { container } = render(<Delta value={-3} neutral />)
    expect(root(container)).toHaveAttribute("data-direction", "down")
    expect(root(container)).toHaveAttribute("data-tone", "neutral")
  })

  it("reads moves inside the threshold as no change", () => {
    const { container } = render(<Delta value={0.04} threshold={0.05} />)
    expect(root(container)).toHaveTextContent("no change 0.0%")
    expect(root(container)).toHaveAttribute("data-direction", "flat")
  })

  it("prints percentage points and honours a custom format", () => {
    const { container, rerender } = render(<Delta value={-1.25} unit="points" />)
    expect(root(container)).toHaveTextContent("down 1.3pp")
    rerender(<Delta value={-1200} format={(n) => `$${n.toLocaleString("en-US")}`} />)
    expect(root(container)).toHaveTextContent("down $1,200")
  })
})
