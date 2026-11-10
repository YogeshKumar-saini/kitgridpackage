import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Toggle } from "./toggle.js"

describe("Toggle", () => {
  it("flips aria-pressed on click, Enter and Space", async () => {
    const onPressedChange = jest.fn()
    render(
      <Toggle aria-label="Bold" onPressedChange={onPressedChange}>
        B
      </Toggle>,
    )
    const toggle = screen.getByRole("button", { name: "Bold" })
    expect(toggle).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-pressed", "true")
    await userEvent.keyboard("{Enter}")
    expect(toggle).toHaveAttribute("aria-pressed", "false")
    await userEvent.keyboard(" ")
    expect(onPressedChange).toHaveBeenLastCalledWith(true)
  })

  it("respects a controlled value", async () => {
    render(
      <Toggle aria-label="Italic" pressed>
        I
      </Toggle>,
    )
    await userEvent.click(screen.getByRole("button"))
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true")
  })

  it("does nothing while disabled", async () => {
    const onPressedChange = jest.fn()
    render(
      <Toggle aria-label="Mute" disabled onPressedChange={onPressedChange}>
        M
      </Toggle>,
    )
    await userEvent.click(screen.getByRole("button"))
    expect(onPressedChange).not.toHaveBeenCalled()
  })
})
