import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { CheckboxCard } from "./checkbox-card.js"

describe("CheckboxCard", () => {
  it("is a native checkbox named by its label", () => {
    render(<CheckboxCard label="Gift wrap" description="Recycled paper" aside="$4" />)
    const box = screen.getByRole("checkbox", { name: /Gift wrap/ })
    expect(box).not.toBeChecked()
  })

  it("toggles from anywhere on the card and from Space", async () => {
    const onCheckedChange = jest.fn()
    render(<CheckboxCard label="Gift wrap" aside="$4" onCheckedChange={onCheckedChange} />)
    await userEvent.click(screen.getByText("$4"))
    expect(onCheckedChange).toHaveBeenLastCalledWith(true)
    screen.getByRole("checkbox").focus()
    await userEvent.keyboard(" ")
    expect(onCheckedChange).toHaveBeenLastCalledWith(false)
  })

  it("submits with a form", () => {
    render(
      <form data-testid="form">
        <CheckboxCard label="Insurance" name="addons" value="insurance" defaultChecked />
      </form>,
    )
    const data = new FormData(screen.getByTestId("form") as HTMLFormElement)
    expect(data.getAll("addons")).toEqual(["insurance"])
  })

  it("does not toggle when disabled", async () => {
    render(<CheckboxCard label="Express" disabled />)
    await userEvent.click(screen.getByText("Express"))
    expect(screen.getByRole("checkbox")).not.toBeChecked()
  })
})
