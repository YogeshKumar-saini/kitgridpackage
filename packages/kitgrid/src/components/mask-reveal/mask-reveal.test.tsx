import { render, screen } from "@testing-library/react"
import { MaskReveal } from "./mask-reveal.js"

describe("MaskReveal", () => {
  it("exposes the base and hides the revealed layer", () => {
    render(
      <MaskReveal reveal={<p>Hidden blueprint</p>}>
        <p>Finished product</p>
      </MaskReveal>,
    )
    expect(screen.getByText("Finished product")).toBeVisible()
    expect(screen.getByText("Hidden blueprint").parentElement).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("passes the spotlight size to CSS", () => {
    const { container } = render(<MaskReveal reveal="x" size={300} />)
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue("--_size")).toBe(
      "300px",
    )
  })
})
