import { fireEvent, render, screen } from "@testing-library/react"
import { ChatThread, ChatThreadDivider } from "./chat-thread.js"
import { dayLabel } from "./day.js"

const now = new Date(2026, 9, 24, 15, 0)

describe("ChatThread", () => {
  it("is a named, polite log that reports busy", () => {
    render(
      <ChatThread busy>
        <p>Hello</p>
      </ChatThread>,
    )
    const log = screen.getByRole("log", { name: "Conversation" })
    expect(log).toHaveAttribute("aria-live", "polite")
    expect(log).toHaveAttribute("aria-busy", "true")
    expect(log).toHaveAttribute("tabindex", "0")
  })

  it("shows the empty state only without messages", () => {
    const { rerender } = render(
      <ChatThread empty={<p>Ask anything</p>}>{[]}</ChatThread>,
    )
    expect(screen.getByText("Ask anything")).toBeInTheDocument()
    rerender(
      <ChatThread empty={<p>Ask anything</p>}>
        <p>Hi</p>
      </ChatThread>,
    )
    expect(screen.queryByText("Ask anything")).toBeNull()
  })

  it("offers a jump back once scrolled away from the end", () => {
    render(
      <ChatThread>
        <p>Hello</p>
      </ChatThread>,
    )
    const log = screen.getByRole("log")
    Object.defineProperty(log, "scrollHeight", { value: 1000, configurable: true })
    Object.defineProperty(log, "clientHeight", { value: 300, configurable: true })
    log.scrollTop = 100
    fireEvent.scroll(log)
    const jump = screen.getByRole("button", { name: "Jump to latest" })
    fireEvent.click(jump)
    expect(screen.queryByRole("button", { name: "Jump to latest" })).toBeNull()
  })

  it("labels day dividers", () => {
    render(
      <ChatThreadDivider date={new Date(2026, 9, 23, 9)} now={now} locale="en-US" />,
    )
    expect(screen.getByText("Yesterday")).toBeInTheDocument()
    expect(dayLabel(new Date(2026, 9, 24, 1), now, "en-US")).toBe("Today")
    expect(dayLabel(new Date(2026, 9, 21), now, "en-US")).toBe("Wednesday")
    expect(dayLabel(new Date(2026, 2, 3), now, "en-US")).toBe("March 3")
    expect(dayLabel(new Date(2025, 2, 3), now, "en-US")).toBe("March 3, 2025")
  })
})
