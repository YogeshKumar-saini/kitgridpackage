import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { PromptInput } from "./prompt-input.js"

describe("PromptInput", () => {
  it("sends on Enter, adds a line on Shift+Enter and clears", async () => {
    const onSubmit = jest.fn()
    render(<PromptInput onSubmit={onSubmit} />)
    const box = screen.getByRole("textbox", { name: "Message" })
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled()
    await userEvent.type(box, "Top cities{Shift>}{Enter}{/Shift}by revenue")
    expect(box).toHaveValue("Top cities\nby revenue")
    await userEvent.keyboard("{Enter}")
    expect(onSubmit).toHaveBeenCalledWith("Top cities\nby revenue")
    expect(box).toHaveValue("")
  })

  it("ignores Enter while an IME is composing and blank drafts", () => {
    const onSubmit = jest.fn()
    render(<PromptInput onSubmit={onSubmit} defaultValue="नमस्ते" />)
    const box = screen.getByRole("textbox")
    fireEvent.keyDown(box, { key: "Enter", isComposing: true })
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.change(box, { target: { value: "   " } })
    fireEvent.keyDown(box, { key: "Enter" })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("swaps send for stop while streaming", async () => {
    const onStop = jest.fn()
    const onSubmit = jest.fn()
    render(
      <PromptInput streaming onStop={onStop} onSubmit={onSubmit} defaultValue="Hi" />,
    )
    expect(screen.queryByRole("button", { name: "Send" })).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Stop" }))
    expect(onStop).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("supports a controlled value and slots", async () => {
    const onValueChange = jest.fn()
    render(
      <PromptInput
        value="Draft"
        onValueChange={onValueChange}
        attachments={<span>orders.csv</span>}
        toolbar={<button type="button">Attach</button>}
      />,
    )
    expect(screen.getByText("orders.csv")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Attach" })).toBeInTheDocument()
    await userEvent.type(screen.getByRole("textbox"), "s")
    expect(onValueChange).toHaveBeenLastCalledWith("Drafts")
  })
})
