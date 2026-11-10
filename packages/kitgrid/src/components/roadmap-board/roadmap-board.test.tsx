import { render, screen, within } from "@testing-library/react"
import { RoadmapBoard } from "./roadmap-board.js"

describe("RoadmapBoard", () => {
  it("sorts items into named now, next and later regions", () => {
    render(
      <RoadmapBoard
        items={[
          { id: "1", title: "Scheduled exports", stage: "now", votes: 42, tag: "Exports" },
          { id: "2", title: "Row-level security", stage: "next", href: "#rls" },
          { id: "3", title: "Mobile app", stage: "later", votes: 1 },
          { id: "4", title: "Slack alerts", stage: "now" },
        ]}
      />,
    )
    const now = screen.getByRole("region", { name: "Now" })
    expect(within(now).getAllByRole("listitem")).toHaveLength(2)
    expect(within(now).getByText("42 votes")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Row-level security" })).toHaveAttribute("href", "#rls")
    expect(within(screen.getByRole("region", { name: /Later/ })).getByText("1 vote")).toBeInTheDocument()
  })

  it("collapses on its own width: the container and the one-column rule sit on different elements", () => {
    const { container } = render(<RoadmapBoard items={[]} />)
    const root = container.firstElementChild as HTMLElement
    const grid = root.firstElementChild
    expect(root).toHaveClass("@container")
    expect(root).not.toHaveClass("@max-[40rem]:grid-cols-1")
    expect(grid).toHaveClass("@max-[40rem]:grid-cols-1")
    expect(grid).not.toHaveClass("@container")
  })
})
