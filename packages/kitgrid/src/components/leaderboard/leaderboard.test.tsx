import { render, screen } from "@testing-library/react"
import { Leaderboard } from "./leaderboard.js"

const items = [
  { id: "a", name: "Mira Chen", value: 820 },
  { id: "b", name: "Tomás Ruiz", value: 1240, movement: 2 },
  { id: "c", name: "Ama Owusu", value: 990, movement: -1 },
]

describe("Leaderboard", () => {
  it("ranks by value in an ordered list", () => {
    render(<Leaderboard items={items} />)
    const rows = screen.getAllByRole("listitem")
    expect(rows[0]).toHaveTextContent("Rank 1")
    expect(rows[0]).toHaveTextContent("Tomás Ruiz")
    expect(rows[0]).toHaveTextContent("1,240")
    expect(rows[0]).toHaveAttribute("data-rank", "1")
    expect(rows[2]).toHaveTextContent("Mira Chen")
  })

  it("announces movement in words", () => {
    render(<Leaderboard items={items} />)
    expect(screen.getByText("up 2")).toBeInTheDocument()
    expect(screen.getByText("down 1")).toBeInTheDocument()
  })

  it("marks the highlighted row as current and scales bars", () => {
    render(<Leaderboard items={items} highlightId="a" />)
    const mine = screen.getByText("Mira Chen").closest("li") as HTMLElement
    expect(mine).toHaveAttribute("aria-current", "true")
    expect(Number(mine.style.getPropertyValue("--_size"))).toBeCloseTo(820 / 1240)
  })
})
