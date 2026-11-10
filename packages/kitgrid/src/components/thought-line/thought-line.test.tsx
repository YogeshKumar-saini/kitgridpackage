import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { formatThoughtDuration, ThoughtLine } from "./thought-line.js"

describe("ThoughtLine", () => {
  it("formats durations", () => {
    expect(formatThoughtDuration(4.12)).toBe("4.1s")
    expect(formatThoughtDuration(72)).toBe("1m 12.0s")
  })

  it("is open while active and folds once settled", () => {
    const { rerender } = render(
      <ThoughtLine active label="Querying orders">
        <p>Step one</p>
      </ThoughtLine>,
    )
    const trigger = screen.getByRole("button", { name: /Querying orders/ })
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("status")).toHaveTextContent("Querying orders")

    rerender(
      <ThoughtLine label="Querying orders" duration={4.1}>
        <p>Step one</p>
      </ThoughtLine>,
    )
    expect(screen.getByRole("button", { name: "Thought for 4.1s" })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
  })

  it("toggles on click and reports the change", async () => {
    const onOpenChange = jest.fn()
    render(
      <ThoughtLine label="x" duration={2} onOpenChange={onOpenChange}>
        <p>Detail</p>
      </ThoughtLine>,
    )
    const trigger = screen.getByRole("button")
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(onOpenChange).toHaveBeenCalledWith(true)
    const panel = document.getElementById(trigger.getAttribute("aria-controls") ?? "")
    expect(panel).toHaveTextContent("Detail")
  })

  it("renders plain text without steps", () => {
    render(<ThoughtLine label="x" />)
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getAllByText("Thought")).toHaveLength(2)
  })
})
