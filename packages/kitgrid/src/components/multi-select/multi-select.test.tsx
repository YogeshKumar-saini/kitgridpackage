import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { MultiSelect, type MultiSelectOption } from "./multi-select.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

const team: MultiSelectOption[] = [
  { value: "ana", label: "Ana Ribeiro" },
  { value: "kenji", label: "Kenji Mori" },
  { value: "lea", label: "Léa Martin" },
  { value: "omar", label: "Omar Haddad", disabled: true },
]

describe("MultiSelect", () => {
  it("exposes a multi-selectable listbox", async () => {
    render(<MultiSelect aria-label="Reviewers" options={team} />)
    await userEvent.click(screen.getByRole("combobox", { name: "Reviewers" }))
    expect(screen.getByRole("listbox")).toHaveAttribute("aria-multiselectable", "true")
  })

  it("toggles options with Enter and keeps the list open", async () => {
    const onValueChange = jest.fn()
    render(<MultiSelect aria-label="Reviewers" options={team} onValueChange={onValueChange} />)
    screen.getByRole("combobox").focus()
    await userEvent.keyboard("{ArrowDown}{Enter}{ArrowDown}{Enter}")
    expect(onValueChange).toHaveBeenLastCalledWith(["ana", "kenji"])
    expect(screen.getByRole("listbox")).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Ana Ribeiro" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    await userEvent.keyboard("{ArrowUp}{Enter}")
    expect(onValueChange).toHaveBeenLastCalledWith(["kenji"])
  })

  it("filters by the query and removes chips with their button", async () => {
    render(<MultiSelect aria-label="Reviewers" options={team} defaultValue={["lea"]} />)
    await userEvent.type(screen.getByRole("combobox"), "mor")
    expect(screen.getAllByRole("option")).toHaveLength(1)
    await userEvent.click(screen.getByRole("button", { name: "Remove Léa Martin" }))
    expect(screen.queryByRole("button", { name: "Remove Léa Martin" })).not.toBeInTheDocument()
  })

  it("removes the last chip with two Backspace presses", async () => {
    const onValueChange = jest.fn()
    render(
      <MultiSelect
        aria-label="Reviewers"
        options={team}
        defaultValue={["ana", "kenji"]}
        onValueChange={onValueChange}
      />,
    )
    screen.getByRole("combobox").focus()
    await userEvent.keyboard("{Backspace}")
    expect(onValueChange).not.toHaveBeenCalled()
    await userEvent.keyboard("{Backspace}")
    expect(onValueChange).toHaveBeenLastCalledWith(["ana"])
  })

  it("collapses extra chips into a count", () => {
    render(
      <MultiSelect
        aria-label="Reviewers"
        options={team}
        defaultValue={["ana", "kenji", "lea"]}
        maxChips={1}
      />,
    )
    expect(screen.getByText("+2")).toBeInTheDocument()
  })
})
