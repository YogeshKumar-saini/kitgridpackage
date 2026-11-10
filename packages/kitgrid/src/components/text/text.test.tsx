import { render, screen } from "@testing-library/react"
import { Text } from "./text.js"

describe("Text", () => {
  it("renders a paragraph on the base size", () => {
    render(<Text>Body copy</Text>)
    const text = screen.getByText("Body copy")
    expect(text.tagName).toBe("P")
    expect(text).toHaveAttribute("data-size", "base")
    expect(text).not.toHaveAttribute("data-tone")
  })

  it("clamps to a number of lines and exposes tone and figures", () => {
    render(
      <Text as="span" lines={3} tone="muted" tabular mono>
        1,204
      </Text>,
    )
    const text = screen.getByText("1,204")
    expect(text.tagName).toBe("SPAN")
    expect(text).toHaveAttribute("data-clamp")
    expect(text.style.getPropertyValue("--_lines")).toBe("3")
    expect(text).toHaveAttribute("data-tone", "muted")
    expect(text).toHaveAttribute("data-tabular")
    expect(text).toHaveAttribute("data-mono")
  })
})
