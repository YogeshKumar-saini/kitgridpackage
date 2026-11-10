import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ApiKeyField } from "./api-key-field.js"

const key = "sk_test_fake_mock_key_for_testing_only_do_not_use"

describe("ApiKeyField", () => {
  it("masks all but the prefix and tail until revealed", async () => {
    const user = userEvent.setup()
    render(<ApiKeyField name="Production" value={key} />)
    const group = screen.getByRole("group", { name: "Production" })
    expect(group).toHaveTextContent("sk_test_")
    expect(group).toHaveTextContent("use")
    expect(group).not.toHaveTextContent(key)
    await user.click(screen.getByRole("button", { name: "Show key" }))
    expect(screen.getByRole("button", { name: "Show key" })).toHaveAttribute("aria-pressed", "true")
    expect(group).toHaveTextContent(key)
  })

  it("copies the full key", async () => {
    const user = userEvent.setup()
    const writeText = jest.spyOn(navigator.clipboard, "writeText")
    render(<ApiKeyField name="Production" value={key} />)
    await user.click(screen.getByRole("button", { name: "Copy key" }))
    expect(writeText).toHaveBeenCalledWith(key)
  })

  it("asks before regenerating, and Escape cancels back to the trigger", async () => {
    const user = userEvent.setup()
    const onRegenerate = jest.fn()
    render(<ApiKeyField name="Production" value={key} onRegenerate={onRegenerate} />)
    await user.click(screen.getByRole("button", { name: "Regenerate" }))
    expect(
      screen.getByRole("alertdialog", { name: "The current key stops working now." }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus()
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(screen.getByRole("button", { name: "Regenerate" })).toHaveFocus()
    await user.click(screen.getByRole("button", { name: "Regenerate" }))
    await user.click(screen.getByRole("button", { name: "Regenerate key" }))
    expect(onRegenerate).toHaveBeenCalledTimes(1)
  })
})
