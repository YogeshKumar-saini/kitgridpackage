import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { SuggestionChips } from "./suggestion-chips.js"

describe("SuggestionChips", () => {
  it("names the group by its title and picks a suggestion", async () => {
    const onSelect = jest.fn()
    render(
      <SuggestionChips
        title="Follow up"
        suggestions={[
          "Why did Pune drop?",
          { value: "split", label: "Split by channel" },
        ]}
        onSelect={onSelect}
      />,
    )
    expect(screen.getByRole("group", { name: "Follow up" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Split by channel" }))
    expect(onSelect).toHaveBeenCalledWith("split")
    await userEvent.click(screen.getByRole("button", { name: "Why did Pune drop?" }))
    expect(onSelect).toHaveBeenLastCalledWith("Why did Pune drop?")
  })

  it("can be disabled", () => {
    render(<SuggestionChips suggestions={["a"]} disabled />)
    expect(screen.getByRole("button", { name: "a" })).toBeDisabled()
  })
})
