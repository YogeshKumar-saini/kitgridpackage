import { render, screen } from "@testing-library/react"
import { Separator } from "./separator.js"

describe("Separator", () => {
  it("is hidden from the accessibility tree when decorative", () => {
    const { container } = render(<Separator />)
    expect(container.firstElementChild).toHaveAttribute("role", "none")
    expect(screen.queryByRole("separator")).toBeNull()
  })

  it("exposes role and orientation when semantic", () => {
    render(<Separator decorative={false} orientation="vertical" />)
    expect(screen.getByRole("separator")).toHaveAttribute(
      "aria-orientation",
      "vertical",
    )
  })

  it("names a semantic labelled separator and shows the label", () => {
    render(<Separator decorative={false} label="or" labelPosition="start" />)
    const separator = screen.getByRole("separator", { name: "or" })
    expect(separator).toHaveAttribute("data-label-position", "start")
    expect(separator).toHaveTextContent("or")
  })
})
