import { render, screen } from "@testing-library/react"
import { MarkdownText } from "./markdown-text.js"
import { safeHref } from "./parse.js"

const source = `# Revenue
Sales rose **12%** this week, mostly *online*.
Second line with \`net_sales\`.

- Mumbai led
- Pune followed

1. Check returns
2. Check refunds

\`\`\`sql
select * from orders
\`\`\`

| City | Revenue |
| --- | --- |
| Mumbai | 2.41M |

See [the report](https://example.com/r) or [bad](javascript:alert(1)).`

describe("MarkdownText", () => {
  it("renders blocks as real elements", () => {
    const { container } = render(<MarkdownText>{source}</MarkdownText>)
    expect(
      screen.getByRole("heading", { level: 3, name: "Revenue" }),
    ).toBeInTheDocument()
    expect(screen.getByText("12%").tagName).toBe("STRONG")
    expect(screen.getByText("online").tagName).toBe("EM")
    expect(screen.getByText("net_sales").tagName).toBe("CODE")
    expect(screen.getAllByRole("list")).toHaveLength(2)
    expect(screen.getAllByRole("listitem")).toHaveLength(4)
    expect(container.querySelector("pre")).toHaveAttribute("data-language", "sql")
    expect(container.querySelector("pre code")).toHaveTextContent(
      "select * from orders",
    )
    expect(screen.getByRole("columnheader", { name: "Revenue" })).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "2.41M" })).toHaveAttribute("data-numeric")
  })

  it("keeps links safe", () => {
    render(<MarkdownText>{source}</MarkdownText>)
    const link = screen.getByRole("link", { name: "the report" })
    expect(link).toHaveAttribute("href", "https://example.com/r")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
    expect(screen.queryByRole("link", { name: "bad" })).toBeNull()
    expect(screen.getByText(/bad/)).toBeInTheDocument()
    expect(safeHref("JavaScript:void(0)")).toBeUndefined()
    expect(safeHref("/docs")).toBe("/docs")
  })

  it("never injects HTML and survives an unclosed fence", () => {
    const { container } = render(
      <MarkdownText headingLevel={2}>
        {"## Hi\n<img src=x onerror=alert(1)>\n```js\nconst a ="}
      </MarkdownText>,
    )
    expect(container.querySelector("img")).toBeNull()
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Hi")
    expect(container.querySelector("pre code")).toHaveTextContent("const a =")
  })

  it("leaves snake_case alone", () => {
    render(<MarkdownText>{"use order_total_value here"}</MarkdownText>)
    expect(screen.getByText("use order_total_value here").tagName).toBe("P")
  })
})
