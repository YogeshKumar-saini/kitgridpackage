import { render } from "@testing-library/react"
import { createRef } from "react"
import { BorderBeam } from "./border-beam.js"

describe("BorderBeam", () => {
  it("is decorative and forwards its ref", () => {
    const ref = createRef<HTMLDivElement>()
    const { container } = render(
      <div style={{ position: "relative" }}>
        <p>Pro plan</p>
        <BorderBeam ref={ref} />
      </div>,
    )
    const beam = container.querySelector(".kg-border-beam")
    expect(beam).toHaveAttribute("aria-hidden", "true")
    expect(ref.current).toBe(beam)
  })

  it("maps props to CSS variables, using a negative delay as a phase offset", () => {
    const { container } = render(
      <BorderBeam
        size={120}
        duration={8}
        delay={4}
        borderWidth={2}
        colorFrom="red"
        colorTo="blue"
        reverse
      />,
    )
    const beam = container.querySelector(".kg-border-beam") as HTMLElement
    expect(beam.style.getPropertyValue("--kg-beam-size")).toBe("120px")
    expect(beam.style.getPropertyValue("--kg-beam-duration")).toBe("8s")
    expect(beam.style.getPropertyValue("--kg-beam-delay")).toBe("-4s")
    expect(beam.style.getPropertyValue("--kg-beam-width")).toBe("2px")
    expect(beam.style.getPropertyValue("--kg-beam-from")).toBe("red")
    expect(beam.style.getPropertyValue("--kg-beam-to")).toBe("blue")
    expect(beam).toHaveAttribute("data-reverse")
  })

  it("copies the inherited corner radius into its motion path", () => {
    const { container } = render(<BorderBeam style={{ borderTopLeftRadius: "12px" }} />)
    const beam = container.querySelector(".kg-border-beam") as HTMLElement
    expect(beam.style.getPropertyValue("--_path-radius")).toBe("12px")
  })
})
