import { render, screen, within } from "@testing-library/react"
import { IncidentTimeline } from "./incident-timeline.js"

describe("IncidentTimeline", () => {
  it("renders updates newest first with stage words and times", () => {
    render(
      <IncidentTimeline
        aria-label="Elevated API errors"
        updates={[
          { id: "3", stage: "resolved", time: "15:10 UTC", dateTime: "2026-10-24T15:10Z", message: "Error rates are back to normal." },
          { id: "2", stage: "identified", time: "14:48 UTC", message: "A bad config push." },
          { id: "1", stage: "investigating", time: "14:32 UTC", message: "Looking into 5xx errors." },
        ]}
      />,
    )
    const list = screen.getByRole("list", { name: "Elevated API errors" })
    const items = within(list).getAllByRole("listitem")
    expect(items[0]).toHaveTextContent("Resolved15:10 UTCError rates are back to normal.")
    expect(items[0]).toHaveAttribute("data-latest")
    expect(items[2]).not.toHaveAttribute("data-latest")
    expect(within(items[0] as HTMLElement).getByText("15:10 UTC")).toHaveAttribute(
      "datetime",
      "2026-10-24T15:10Z",
    )
  })
})
