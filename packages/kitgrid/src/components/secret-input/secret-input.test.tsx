import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { SecretInput } from "./secret-input.js"

describe("SecretInput", () => {
  it("masks by default and toggles reveal with a pressed button", async () => {
    const user = userEvent.setup()
    const onRevealedChange = jest.fn()
    render(
      <SecretInput aria-label="Signing secret" defaultValue="whsec_91ka" onRevealedChange={onRevealedChange} />,
    )
    const input = screen.getByLabelText("Signing secret")
    expect(input).toHaveAttribute("type", "password")
    const toggle = screen.getByRole("button", { name: "Show value" })
    expect(toggle).toHaveAttribute("aria-pressed", "false")
    await user.click(toggle)
    expect(input).toHaveAttribute("type", "text")
    expect(toggle).toHaveAttribute("aria-pressed", "true")
    expect(onRevealedChange).toHaveBeenCalledWith(true)
  })

  it("copies the current value when copyable", async () => {
    const user = userEvent.setup()
    const writeText = jest.spyOn(navigator.clipboard, "writeText")
    render(<SecretInput aria-label="Token" defaultValue="tok_1" copyable />)
    await user.type(screen.getByLabelText("Token"), "23")
    await user.click(screen.getByRole("button", { name: "Copy value" }))
    expect(writeText).toHaveBeenCalledWith("tok_123")
    expect(screen.getByRole("status")).toHaveTextContent("Copied")
  })
})
