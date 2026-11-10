import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ReactionsBar } from "./reactions-bar.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

describe("ReactionsBar", () => {
  it("toggles reactions with pressed state and live counts", async () => {
    const user = userEvent.setup()
    const onToggle = jest.fn()
    render(
      <ReactionsBar
        onToggle={onToggle}
        reactions={[
          { emoji: "👍", label: "thumbs up", count: 3, reacted: true },
          { emoji: "🎉", label: "party", count: 1 },
        ]}
      />,
    )
    expect(screen.getByRole("group", { name: "Reactions" })).toBeInTheDocument()
    const party = screen.getByRole("button", { name: "party, 1" })
    expect(party).toHaveAttribute("aria-pressed", "false")
    await user.click(party)
    expect(onToggle).toHaveBeenCalledWith("🎉", true)
    expect(screen.getByRole("button", { name: "party, 2" })).toHaveAttribute("aria-pressed", "true")
    await user.click(screen.getByRole("button", { name: "thumbs up, 3" }))
    expect(onToggle).toHaveBeenLastCalledWith("👍", false)
  })

  it("adds a new reaction from the picker", async () => {
    const user = userEvent.setup()
    render(
      <ReactionsBar reactions={[]} choices={[{ emoji: "🚀", label: "rocket" }]} />,
    )
    await user.click(screen.getByRole("button", { name: "Add reaction" }))
    await user.click(screen.getByRole("button", { name: "rocket" }))
    expect(screen.getByRole("button", { name: "rocket, 1" })).toHaveAttribute("aria-pressed", "true")
  })

  it("draws an icon in place of the emoji when one is given", () => {
    render(
      <ReactionsBar
        reactions={[{ emoji: "+1", icon: <svg data-testid="agree" />, label: "Agree", count: 2 }]}
      />,
    )
    const pill = screen.getByRole("button", { name: "Agree, 2" })
    expect(pill.querySelector("[data-testid='agree']")).not.toBeNull()
    expect(pill).not.toHaveTextContent("+1")
  })
})
