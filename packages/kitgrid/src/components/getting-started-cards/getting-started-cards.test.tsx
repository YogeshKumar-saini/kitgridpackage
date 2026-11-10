import { render, screen } from "@testing-library/react"
import { GettingStartedCards } from "./getting-started-cards.js"

describe("GettingStartedCards", () => {
  it("renders a list of cards, linking when given an href and writing done states", () => {
    render(
      <GettingStartedCards
        aria-label="Next steps"
        items={[
          { id: "a", title: "Connect data", href: "#connect", meta: "2 min" },
          { id: "b", title: "Invite your team", done: true },
        ]}
      />,
    )
    expect(screen.getByRole("list", { name: "Next steps" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Connect data/ })).toHaveAttribute("href", "#connect")
    expect(screen.getAllByRole("listitem")[1]).toHaveTextContent("Invite your teamDone")
    expect(screen.getAllByRole("link")).toHaveLength(1)
  })
})
