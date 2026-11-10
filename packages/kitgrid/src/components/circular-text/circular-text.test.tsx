import { render, screen } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { CircularText, fitCircularTextRadius } from "./circular-text.js"

describe("CircularText", () => {
  it("exposes the text once and hides the decorative ring", () => {
    const { container } = render(<CircularText text="FREE RETURNS ✦ 30 DAYS ✦ " />)
    expect(container.querySelector(".kg-visually-hidden")).toHaveTextContent(
      /^FREE RETURNS ✦ 30 DAYS ✦$/,
    )
    expect(container.querySelector(".kg-circular-text__spin")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("stretches the text over exactly one circumference", () => {
    const { container } = render(<CircularText text="ORBIT ✦ " radius={60} />)
    const path = container.querySelector("textPath")
    expect(path).toHaveAttribute("textLength", (2 * Math.PI * 60).toFixed(2))
    expect(path).toHaveAttribute("lengthAdjust", "spacing")
    expect(path?.getAttribute("href")).toBe(`#${container.querySelector("path")?.id}`)
  })

  it("sizes the radius from the text when none is given", () => {
    const short = fitCircularTextRadius("SALE ", 14)
    const long = fitCircularTextRadius("LIMITED EDITION ✦ SIGNED BY THE ARTIST ✦ ", 14)
    expect(long).toBeGreaterThan(short)
    const { container } = render(
      <CircularText text="LIMITED EDITION ✦ SIGNED BY THE ARTIST ✦ " fontSize={14} />,
    )
    expect(container.querySelector("textPath")).toHaveAttribute(
      "textLength",
      (2 * Math.PI * long).toFixed(2),
    )
  })

  it("reflects direction and hover behaviour and renders a centre slot", () => {
    render(
      <CircularText
        data-testid="ring"
        text="NEW SEASON "
        direction="counterclockwise"
        hover="reverse"
        duration={12}
      >
        <span>26</span>
      </CircularText>,
    )
    const ring = screen.getByTestId("ring")
    expect(ring).toHaveAttribute("data-direction", "counterclockwise")
    expect(ring).toHaveAttribute("data-hover", "reverse")
    expect(ring.style.getPropertyValue("--_duration")).toBe("12s")
    expect(screen.getByText("26").parentElement).toHaveClass(
      "kg-circular-text__center",
    )
  })

  it("renders on the server without effects", () => {
    const html = renderToString(<CircularText text="STUDIO ✦ " />)
    expect(html).toContain("textPath")
    expect(html).toContain("STUDIO ✦")
  })
})
