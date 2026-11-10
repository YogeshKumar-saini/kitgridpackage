import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { CodeBlock } from "./code-block.js"
import { tokenizeCode } from "./tokenize.js"

const sample = `const total = sum(1, 2)\n// done\nreturn "ok"`

describe("CodeBlock", () => {
  it("renders every line and a focusable scroll region", () => {
    const { container } = render(<CodeBlock code={sample} title="cart.ts" language="ts" />)
    expect(container.querySelectorAll(".kg-code-block__line")).toHaveLength(3)
    expect(container.querySelector("pre")).toHaveAttribute("tabindex", "0")
    expect(screen.getByText("cart.ts")).toBeInTheDocument()
    expect(container.querySelector("code")?.textContent).toBe(sample)
  })

  it("adds hidden line numbers and highlights ranges", () => {
    const { container } = render(
      <CodeBlock code={sample} lineNumbers startLine={10} highlightLines={[[11, 12]]} />,
    )
    const numbers = container.querySelectorAll(".kg-code-block__number")
    expect(numbers[0]).toHaveTextContent("10")
    expect(numbers[0]).toHaveAttribute("aria-hidden", "true")
    const lines = container.querySelectorAll(".kg-code-block__line")
    expect(lines[0]).not.toHaveAttribute("data-highlighted")
    expect(lines[2]).toHaveAttribute("data-highlighted", "true")
  })

  it("copies the code and announces it", async () => {
    const user = userEvent.setup()
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    render(<CodeBlock code={`${sample}\n`} />)
    await user.click(screen.getByRole("button", { name: "Copy code" }))
    expect(writeText).toHaveBeenCalledWith(sample)
    expect(await screen.findByRole("status")).toHaveTextContent("Copied")
  })

  it("accepts pre-tokenized lines", () => {
    const { container } = render(
      <CodeBlock code="x" tokens={[[{ text: "let", type: "keyword" }, { text: " x" }]]} />,
    )
    expect(container.querySelector('[data-token="keyword"]')).toHaveTextContent("let")
  })

  it("tokenizes keywords, strings, comments and calls", () => {
    const [first, second, third] = tokenizeCode(sample)
    expect(first?.[0]).toEqual({ text: "const", type: "keyword" })
    expect(first?.find((t) => t.type === "function")?.text).toBe("sum")
    expect(second?.[0]).toEqual({ text: "// done", type: "comment" })
    expect(third?.find((t) => t.type === "string")?.text).toBe('"ok"')
  })
})
