import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Field } from "../field/field.js"
import { DatePicker } from "./date-picker.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

describe("DatePicker", () => {
  it("opens a dialog with the calendar focused on the value", async () => {
    render(
      <Field label="Delivery">
        <DatePicker locale="en-US" defaultValue="2026-05-14" />
      </Field>,
    )
    const trigger = screen.getByRole("button", { name: /^Delivery/ })
    expect(trigger).toHaveTextContent("May 14, 2026")
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("dialog", { name: "Choose date" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Thursday, May 14, 2026" })).toHaveFocus()
  })

  it("picks a day, closes and returns focus", async () => {
    const onValueChange = jest.fn()
    render(
      <DatePicker
        aria-label="Delivery"
        locale="en-US"
        defaultValue="2026-05-14"
        onValueChange={onValueChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /^Delivery/ }))
    await userEvent.keyboard("{ArrowRight}{Enter}")
    expect(onValueChange).toHaveBeenCalledWith("2026-05-15")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^Delivery/ })).toHaveFocus()
  })

  it("closes on Escape", async () => {
    render(<DatePicker aria-label="Delivery" locale="en-US" />)
    await userEvent.click(screen.getByRole("button", { name: /^Delivery/ }))
    await userEvent.keyboard("{Escape}")
    expect(screen.getByRole("button", { name: /^Delivery/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
  })

  it("writes a range and clears it", async () => {
    const onValueChange = jest.fn()
    render(
      <DatePicker
        mode="range"
        aria-label="Stay"
        locale="en-US"
        formatOptions={{ month: "short", day: "numeric" }}
        defaultValue={{ start: "2026-07-03", end: "2026-07-09" }}
        clearable
        onValueChange={onValueChange}
      />,
    )
    expect(screen.getByRole("button", { name: /^Stay/ })).toHaveTextContent("Jul 3 - Jul 9")
    await userEvent.click(screen.getByRole("button", { name: "Clear date" }))
    expect(onValueChange).toHaveBeenCalledWith(null)
  })
})
