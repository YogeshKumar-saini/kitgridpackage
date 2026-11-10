import { act, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ChatMessage } from "./chat-message.js"

describe("ChatMessage", () => {
  it("names the article by its author and defaults per sender", () => {
    render(
      <>
        <ChatMessage from="user">Hi</ChatMessage>
        <ChatMessage>Hello</ChatMessage>
        <ChatMessage from="system" name="Notice">
          Model changed
        </ChatMessage>
      </>,
    )
    expect(screen.getByRole("article", { name: "You" })).toHaveTextContent("Hi")
    expect(screen.getByRole("article", { name: "Assistant" })).toHaveAttribute(
      "data-from",
      "assistant",
    )
    expect(screen.getByRole("article", { name: "Notice" })).toBeInTheDocument()
  })

  it("copies the text and confirms it", async () => {
    const user = userEvent.setup()
    const writeText = jest.fn<(text: string) => Promise<void>>(() => Promise.resolve())
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    })
    render(<ChatMessage copyText="Revenue rose 12%">Revenue rose 12%</ChatMessage>)
    await user.click(screen.getByRole("button", { name: "Copy message" }))
    expect(writeText).toHaveBeenCalledWith("Revenue rose 12%")
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Copied")
  })

  it("retries and hides actions while streaming", async () => {
    const onRetry = jest.fn()
    const { rerender } = render(
      <ChatMessage streaming copyText="x" onRetry={onRetry}>
        Working
      </ChatMessage>,
    )
    expect(screen.getByRole("article")).toHaveAttribute("aria-busy", "true")
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull()
    rerender(
      <ChatMessage copyText="x" onRetry={onRetry}>
        Done
      </ChatMessage>,
    )
    await act(() => userEvent.click(screen.getByRole("button", { name: "Retry" })))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
