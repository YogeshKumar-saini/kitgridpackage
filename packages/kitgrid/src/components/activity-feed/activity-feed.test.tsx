import { render, screen, within } from "@testing-library/react"
import { ActivityFeed, type ActivityFeedItem } from "./activity-feed.js"

const now = new Date("2026-10-24T15:00:00Z")

const items: ActivityFeedItem[] = [
  {
    id: "1",
    actor: "Priya Raman",
    action: "changed access for",
    target: "Finance team",
    detail: "Exports on, Billing off",
    tone: "accent",
    time: "2026-10-24T14:12:00Z",
  },
  { id: "2", actor: "Mateo Alvarez", action: "exported", target: "Q3 orders", time: "2026-10-24T09:30:00Z" },
  { id: "3", actor: "Hana Kobayashi", action: "joined", time: "2026-10-23T18:05:00Z" },
  { id: "4", action: "Nightly sync finished", tone: "success", time: "2026-10-20T02:00:00Z" },
]

describe("ActivityFeed", () => {
  it("groups events under a heading per day relative to now", () => {
    render(<ActivityFeed items={items} now={now} locale="en-US" timeZone="UTC" />)
    const today = screen.getByRole("region", { name: "Today" })
    expect(within(today).getAllByRole("listitem")).toHaveLength(2)
    expect(screen.getByRole("region", { name: "Yesterday" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: "Tuesday, Oct 20" })).toBeInTheDocument()
  })

  it("reads each event as a sentence with a machine-readable time", () => {
    render(<ActivityFeed items={items} now={now} locale="en-US" timeZone="UTC" />)
    const first = screen.getAllByRole("listitem")[0] as HTMLElement
    expect(first).toHaveTextContent("Priya Raman changed access for Finance team")
    expect(first).toHaveTextContent("Exports on, Billing off")
    expect(first).toHaveAttribute("data-tone", "accent")
    const time = first.querySelector("time") as HTMLTimeElement
    expect(time).toHaveAttribute("datetime", "2026-10-24T14:12:00.000Z")
    expect(time).toHaveTextContent("2:12 PM")
  })

  it("renders one flat list when not grouping, and the empty slot when there is nothing", () => {
    const { rerender } = render(<ActivityFeed items={items} groupByDay={false} now={now} />)
    expect(screen.queryByRole("heading")).toBeNull()
    expect(screen.getAllByRole("listitem")).toHaveLength(4)
    rerender(<ActivityFeed items={[]} empty="Nothing recorded yet" />)
    expect(screen.getByText("Nothing recorded yet")).toBeInTheDocument()
  })
})
