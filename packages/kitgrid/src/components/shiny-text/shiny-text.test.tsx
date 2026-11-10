import { render, screen } from "@testing-library/react"
import { createRef } from "react"
import { ShinyText } from "./shiny-text.js"

describe("ShinyText", () => {
  it("keeps the text as real, readable content in the chosen element", () => {
    const ref = createRef<HTMLElement>()
    render(
      <ShinyText as="h2" ref={ref}>
        Introducing Pro
      </ShinyText>,
    )
    const heading = screen.getByRole("heading", { name: "Introducing Pro" })
    expect(heading).toHaveClass("kg-shiny-text")
    expect(ref.current).toBe(heading)
  })

  it("maps speed, band width and colours onto custom properties", () => {
    render(
      <ShinyText duration={1500} width={150} baseColor="gray" shineColor="white">
        Shine
      </ShinyText>,
    )
    const node = screen.getByText("Shine")
    expect(node.style.getPropertyValue("--_duration")).toBe("1500ms")
    expect(node.style.getPropertyValue("--_band")).toBe("1")
    expect(node.style.getPropertyValue("--kg-shiny-base")).toBe("gray")
    expect(node.style.getPropertyValue("--kg-shiny-shine")).toBe("white")
  })

  it("can be switched off", () => {
    render(<ShinyText disabled>Static</ShinyText>)
    expect(screen.getByText("Static")).toHaveAttribute("data-disabled")
  })
})
