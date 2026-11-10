import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { SplitButton } from "./split-button.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

describe("SplitButton", () => {
  it("runs the primary action from the main half", async () => {
    const onClick = jest.fn()
    render(
      <SplitButton onClick={onClick} actions={[{ label: "Save as draft" }]}>
        Publish
      </SplitButton>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Publish" }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("opens a menu of alternatives from the labelled menu button", async () => {
    const onDraft = jest.fn()
    render(
      <SplitButton actions={[{ label: "Save as draft", onSelect: onDraft }, { label: "Schedule" }]}>
        Publish
      </SplitButton>,
    )
    const menuButton = screen.getByRole("button", { name: "More options" })
    expect(menuButton).toHaveAttribute("aria-haspopup", "menu")
    await userEvent.click(menuButton)
    await userEvent.click(screen.getByRole("menuitem", { name: "Save as draft" }))
    expect(onDraft).toHaveBeenCalled()
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })
})
