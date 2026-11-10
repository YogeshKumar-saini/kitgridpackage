import { render, screen } from "@testing-library/react"
import { Timeline } from "./timeline.js"

const items = [
  { title: "Order placed", time: "09:12" },
  { title: "Packed", status: "current" as const },
  { title: "Delivered", status: "upcoming" as const, description: "Est. Friday" },
]

describe("Timeline", () => {
  it("renders an ordered list of events", () => {
    render(<Timeline items={items} aria-label="Order progress" />)
    expect(screen.getByRole("list", { name: "Order progress" }).tagName).toBe("OL")
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
    expect(screen.getByText("Est. Friday")).toBeInTheDocument()
  })

  it("marks the current step for assistive tech", () => {
    render(<Timeline items={items} labels={{ current: "in progress" }} />)
    const current = screen.getAllByRole("listitem")[1] as HTMLElement
    expect(current).toHaveAttribute("aria-current", "step")
    expect(current).toHaveTextContent("Packed, in progress")
    expect(screen.getAllByRole("listitem")[2]).toHaveAttribute("data-status", "upcoming")
  })

  it("ignores alternate alignment when horizontal", () => {
    const { container } = render(
      <Timeline items={items} orientation="horizontal" align="alternate" />,
    )
    expect(container.firstElementChild).toHaveAttribute("data-align", "start")
  })
})
