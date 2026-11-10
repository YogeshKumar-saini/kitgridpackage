import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Calendar } from "./calendar.js"

const day = (label: RegExp) => screen.getByRole("button", { name: label })

describe("Calendar", () => {
  it("renders a labelled grid with one tab stop on the selected day", () => {
    render(<Calendar locale="en-US" weekStartsOn={0} defaultValue="2026-03-12" today="2026-03-02" />)
    const grid = screen.getByRole("grid", { name: "March 2026" })
    expect(grid).toBeInTheDocument()
    const stops = grid.querySelectorAll('button[tabindex="0"]')
    expect(stops).toHaveLength(1)
    expect(stops[0]).toHaveAccessibleName("Thursday, March 12, 2026")
    expect(day(/March 2, 2026/)).toHaveAttribute("aria-current", "date")
    expect(day(/March 12, 2026/).closest("td")).toHaveAttribute("aria-selected", "true")
  })

  it("moves by day, week and month from the keyboard", async () => {
    render(<Calendar locale="en-US" weekStartsOn={0} defaultValue="2026-03-31" />)
    day(/March 31, 2026/).focus()
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByRole("grid", { name: "April 2026" })).toBeInTheDocument()
    expect(day(/April 1, 2026/)).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}")
    expect(day(/April 8, 2026/)).toHaveFocus()
    await userEvent.keyboard("{Home}")
    expect(day(/April 5, 2026/)).toHaveFocus()
    await userEvent.keyboard("{PageUp}")
    expect(day(/March 5, 2026/)).toHaveFocus()
    await userEvent.keyboard("{Shift>}{PageDown}{/Shift}")
    expect(day(/March 5, 2027/)).toHaveFocus()
  })

  it("selects with Enter and reports the day", async () => {
    const onValueChange = jest.fn()
    render(
      <Calendar locale="en-US" defaultMonth="2026-03-01" onValueChange={onValueChange} />,
    )
    day(/March 1, 2026/).focus()
    await userEvent.keyboard("{ArrowRight}{Enter}")
    expect(onValueChange).toHaveBeenCalledWith("2026-03-02")
  })

  it("refuses days outside min and max", async () => {
    const onValueChange = jest.fn()
    render(
      <Calendar
        locale="en-US"
        defaultMonth="2026-03-01"
        min="2026-03-10"
        onValueChange={onValueChange}
      />,
    )
    const early = day(/March 5, 2026/)
    expect(early).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(early)
    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled()
  })

  it("picks a range in two clicks, in either order", async () => {
    const onValueChange = jest.fn()
    render(
      <Calendar
        mode="range"
        locale="en-US"
        defaultMonth="2026-03-01"
        onValueChange={onValueChange}
      />,
    )
    await userEvent.click(day(/March 20, 2026/))
    expect(onValueChange).not.toHaveBeenCalled()
    await userEvent.click(day(/March 14, 2026/))
    expect(onValueChange).toHaveBeenCalledWith({ start: "2026-03-14", end: "2026-03-20" })
    expect(day(/March 17, 2026/).closest("td")).toHaveAttribute("data-in-range")
  })

  it("shows two months and pages with the header buttons", async () => {
    render(<Calendar locale="en-US" months={2} defaultMonth="2026-11-01" />)
    expect(screen.getByRole("grid", { name: "November 2026" })).toBeInTheDocument()
    expect(screen.getByRole("grid", { name: "December 2026" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Next month" }))
    expect(screen.getByRole("grid", { name: "January 2027" })).toBeInTheDocument()
  })
})
