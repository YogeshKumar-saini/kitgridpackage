import { render, screen } from "@testing-library/react"
import { DescriptionList } from "./description-list.js"

const items = [
  { term: "Plan", description: "Scale" },
  { term: "Seats", description: "24" },
  { term: "Renews", description: "Mar 4", span: 9 },
]

describe("DescriptionList", () => {
  it("pairs every term with its definition", () => {
    render(<DescriptionList items={items} />)
    const terms = screen.getAllByRole("term")
    const definitions = screen.getAllByRole("definition")
    expect(terms).toHaveLength(3)
    expect(definitions[1]).toHaveTextContent("24")
    expect(terms[0]?.parentElement).toBe(definitions[0]?.parentElement)
  })

  it("exposes layout and variant as data attributes", () => {
    const { container } = render(
      <DescriptionList items={items} layout="inline" variant="bordered" />,
    )
    const list = container.firstElementChild as HTMLElement
    expect(list).toHaveAttribute("data-layout", "inline")
    expect(list).toHaveAttribute("data-variant", "bordered")
  })

  it("clamps a span to the column count", () => {
    const { container } = render(<DescriptionList items={items} columns={2} />)
    const last = container.querySelectorAll(".kg-description-list__item")[2] as HTMLElement
    expect(last.style.getPropertyValue("--_span")).toBe("2")
  })
})
