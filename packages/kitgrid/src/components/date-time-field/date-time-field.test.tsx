import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { DateTimeField } from "./date-time-field.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

const spin = (name: string) => screen.getByRole("spinbutton", { name })

describe("DateTimeField", () => {
  it("orders date segments by locale", () => {
    const { unmount } = render(<DateTimeField aria-label="Start" locale="en-US" />)
    let names = screen.getAllByRole("spinbutton").map((el) => el.getAttribute("aria-label"))
    expect(names.slice(0, 3)).toEqual(["Month", "Day", "Year"])
    unmount()
    render(<DateTimeField aria-label="Start" locale="en-GB" />)
    names = screen.getAllByRole("spinbutton").map((el) => el.getAttribute("aria-label"))
    expect(names.slice(0, 3)).toEqual(["Day", "Month", "Year"])
  })

  it("emits once every segment is filled", async () => {
    const onValueChange = jest.fn()
    render(
      <DateTimeField
        aria-label="Start"
        locale="en-GB"
        hourCycle={24}
        onValueChange={onValueChange}
      />,
    )
    spin("Day").focus()
    await userEvent.keyboard("25112026")
    expect(spin("Hours")).toHaveFocus()
    expect(onValueChange).not.toHaveBeenCalled()
    await userEvent.keyboard("0930")
    expect(onValueChange).toHaveBeenLastCalledWith("2026-11-25T09:30")
  })

  it("clamps the day when the month shrinks", async () => {
    const onValueChange = jest.fn()
    render(
      <DateTimeField
        aria-label="Due"
        granularity="day"
        locale="en-US"
        defaultValue="2026-01-31"
        onValueChange={onValueChange}
      />,
    )
    spin("Month").focus()
    await userEvent.keyboard("{ArrowUp}")
    expect(onValueChange).toHaveBeenLastCalledWith("2026-02-28")
  })

  it("fills the date from the calendar popup", async () => {
    const onValueChange = jest.fn()
    render(
      <DateTimeField
        aria-label="Due"
        granularity="day"
        locale="en-US"
        defaultValue="2026-03-10"
        onValueChange={onValueChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: "Open calendar" }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    await userEvent.keyboard("{ArrowRight}{Enter}")
    expect(onValueChange).toHaveBeenLastCalledWith("2026-03-11")
    expect(screen.getByRole("button", { name: "Open calendar" })).toHaveFocus()
  })
})
