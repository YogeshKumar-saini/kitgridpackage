import { render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { AgentTrace, type AgentTraceStep } from "./agent-trace.js"

const steps: AgentTraceStep[] = [
  {
    id: "1",
    title: "query_orders",
    status: "done",
    duration: 1.24,
    detail: "412 rows",
  },
  { id: "2", title: "distinct_values", status: "failed", duration: 0.3 },
  { id: "3", title: "chart_revenue", status: "running" },
  { id: "4", title: "summarise", status: "pending" },
]

describe("AgentTrace", () => {
  it("lists steps with spoken status and durations", () => {
    render(<AgentTrace aria-label="Steps" steps={steps} />)
    const list = screen.getByRole("list", { name: "Steps" })
    const items = within(list).getAllByRole("listitem")
    expect(items).toHaveLength(4)
    expect(items[0]).toHaveTextContent("query_orders, Done1.2s")
    expect(items[1]).toHaveTextContent("Failed")
    expect(items[2]).toHaveTextContent("Running…")
    expect(items[3]).toHaveAttribute("data-status", "pending")
  })

  it("reveals a step's detail on demand", async () => {
    render(<AgentTrace steps={steps} />)
    const toggle = screen.getByRole("button", { name: /query_orders/ })
    expect(screen.getByText("412 rows")).not.toBeVisible()
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("412 rows")).toBeVisible()
    expect(screen.getAllByRole("button")).toHaveLength(1)
  })
})
