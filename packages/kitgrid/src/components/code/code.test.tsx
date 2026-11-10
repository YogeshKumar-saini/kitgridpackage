import { render, screen } from "@testing-library/react"
import { Code } from "./code.js"

describe("Code", () => {
  it("renders a code element with its tone", () => {
    render(
      <p>
        Run <Code tone="accent">npm run dev</Code> to start.
      </p>,
    )
    const code = screen.getByText("npm run dev")
    expect(code.tagName).toBe("CODE")
    expect(code).toHaveAttribute("data-tone", "accent")
  })
})
