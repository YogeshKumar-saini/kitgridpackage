import { render } from "@testing-library/react"
import { Highlight, highlightRanges } from "./highlight.js"

describe("Highlight", () => {
  it("wraps every match in a mark, case-insensitively", () => {
    const { container } = render(
      <Highlight query="ship">Shipping ships free. Reship anytime.</Highlight>,
    )
    const marks = container.querySelectorAll("mark")
    expect(marks).toHaveLength(3)
    expect(marks[0]).toHaveTextContent("Ship")
    expect(container).toHaveTextContent("Shipping ships free. Reship anytime.")
  })

  it("prefers the longest overlapping term and escapes regex characters", () => {
    expect(highlightRanges("a+b and a", ["a", "a+b"])).toEqual([
      { text: "a+b", match: true },
      { text: " ", match: false },
      { text: "a", match: true },
      { text: "nd ", match: false },
      { text: "a", match: true },
    ])
  })

  it("honours wholeWord and caseSensitive", () => {
    const { container } = render(
      <Highlight query="Art" wholeWord caseSensitive>
        Art, art and Artist
      </Highlight>,
    )
    expect(container.querySelectorAll("mark")).toHaveLength(1)
  })

  it("renders plain text for an empty query", () => {
    const { container } = render(<Highlight query="  ">Nothing here</Highlight>)
    expect(container.querySelector("mark")).toBeNull()
  })
})
