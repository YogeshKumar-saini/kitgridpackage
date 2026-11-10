import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { LogViewer, type LogViewerEntry } from "./log-viewer.js"

const entries: LogViewerEntry[] = [
  { id: 1, time: "12:00:01", level: "info", message: "Server listening on :8080" },
  { id: 2, time: "12:00:02", level: "debug", message: "Cache warm" },
  { id: 3, time: "12:00:03", level: "warn", message: "Slow query 840ms", source: "db" },
  { id: 4, time: "12:00:04", level: "error", message: "Payment webhook failed" },
]

describe("LogViewer", () => {
  it("renders a log region with every line and level counts", () => {
    render(<LogViewer entries={entries} />)
    expect(screen.getByRole("log")).toHaveAttribute("aria-live", "off")
    expect(screen.getAllByRole("listitem")).toHaveLength(4)
    expect(screen.getByRole("button", { name: "error 1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("filters by level", async () => {
    const user = userEvent.setup()
    render(<LogViewer entries={entries} />)
    await user.click(screen.getByRole("button", { name: "debug 1" }))
    expect(screen.queryByText("Cache warm")).toBeNull()
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
  })

  it("filters by search and highlights the match", async () => {
    const user = userEvent.setup()
    const { container } = render(<LogViewer entries={entries} />)
    await user.type(screen.getByRole("searchbox", { name: "Filter logs" }), "webhook")
    expect(screen.getAllByRole("listitem")).toHaveLength(1)
    expect(container.querySelector("mark")).toHaveTextContent("webhook")
  })

  it("shows an empty message when nothing matches", async () => {
    const user = userEvent.setup()
    render(<LogViewer entries={entries} />)
    await user.type(screen.getByRole("searchbox"), "zzz")
    expect(screen.getByText("No matching lines")).toBeInTheDocument()
  })
})
