import { render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { BackInStockForm } from "./back-in-stock-form.js"

describe("BackInStockForm", () => {
  it("reveals the email field from the trigger and moves focus to it", async () => {
    render(<BackInStockForm onNotify={async () => {}} />)
    await userEvent.click(screen.getByRole("button", { name: "Notify me when available" }))
    const field = screen.getByRole("textbox", { name: "Email address" })
    await waitFor(() => expect(field).toHaveFocus())
  })

  it("validates, submits and confirms with the variant name", async () => {
    const onNotify = jest.fn(async () => {})
    render(<BackInStockForm onNotify={onNotify} variant="Sage / M" defaultExpanded />)
    const field = screen.getByRole("textbox", { name: "Email address" })
    await userEvent.type(field, "nope{Enter}")
    expect(field).toHaveAccessibleDescription("Enter a valid email address.")
    await userEvent.clear(field)
    await userEvent.type(field, "leo@park.dev{Enter}")
    expect(onNotify).toHaveBeenCalledWith("leo@park.dev")
    expect(await screen.findByRole("status")).toHaveTextContent(
      "We'll email you when Sage / M is back.",
    )
  })
})
