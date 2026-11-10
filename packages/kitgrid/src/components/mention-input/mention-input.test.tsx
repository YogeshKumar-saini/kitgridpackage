import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { MentionInput, type MentionInputOption } from "./mention-input.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

const people: MentionInputOption[] = [
  { value: "maya", label: "Maya Chen" },
  { value: "marco", label: "Marco Rossi" },
  { value: "priya", label: "Priya Nair" },
]

describe("MentionInput", () => {
  it("suggests people after the trigger", async () => {
    render(<MentionInput aria-label="Comment" suggestions={people} />)
    const area = screen.getByRole("textbox", { name: "Comment" })
    await userEvent.type(area, "Thanks @ma")
    expect(screen.getAllByRole("option")).toHaveLength(2)
    expect(area).toHaveAttribute("aria-activedescendant", screen.getAllByRole("option")[0]?.id)
  })

  it("inserts the handle with Enter and reports the mention", async () => {
    const onMention = jest.fn()
    const onValueChange = jest.fn()
    render(
      <MentionInput
        aria-label="Comment"
        suggestions={people}
        onMention={onMention}
        onValueChange={onValueChange}
      />,
    )
    await userEvent.type(screen.getByRole("textbox"), "Ask @ma{ArrowDown}{Enter}")
    expect(onMention).toHaveBeenCalledWith(people[1])
    expect(onValueChange).toHaveBeenLastCalledWith("Ask @marco ")
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })

  it("does not trigger inside a word and closes on Escape", async () => {
    render(<MentionInput aria-label="Comment" suggestions={people} />)
    const area = screen.getByRole("textbox")
    await userEvent.type(area, "mail@pri")
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    await userEvent.type(area, " @pri")
    expect(screen.getByRole("listbox")).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })
})
