import { render } from "@testing-library/react"
import { useRef } from "react"
import { AnimatedBeam } from "./animated-beam.js"

const Diagram = ({ curvature = 0 }: { curvature?: number }) => {
  const container = useRef<HTMLDivElement>(null)
  const from = useRef<HTMLDivElement>(null)
  const to = useRef<HTMLDivElement>(null)
  return (
    <div ref={container} style={{ position: "relative" }}>
      <div ref={from}>Store</div>
      <div ref={to}>Warehouse</div>
      <AnimatedBeam
        containerRef={container}
        fromRef={from}
        toRef={to}
        curvature={curvature}
        reverse
      />
    </div>
  )
}

describe("AnimatedBeam", () => {
  it("draws a hidden path and pulse between the two elements", () => {
    const { container } = render(<Diagram curvature={40} />)
    const svg = container.querySelector("svg")
    expect(svg).toHaveAttribute("aria-hidden", "true")
    expect(svg).toHaveAttribute("data-reverse")
    expect(container.querySelector(".kg-animated-beam__path")?.getAttribute("d")).toMatch(/^M /)
    expect(container.querySelector(".kg-animated-beam__pulse")).toHaveAttribute("pathLength", "1")
  })
})
