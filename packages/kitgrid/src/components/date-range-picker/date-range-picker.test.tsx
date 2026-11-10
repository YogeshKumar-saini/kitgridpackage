import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { DateRangePicker, dateRangePickerPresets } from "./date-range-picker.js"

const field = (name: string) =>
  screen.getByLabelText(name, { selector: "input" }) as HTMLInputElement

describe("DateRangePicker", () => {
  it("emits only once both ends are set and in order", () => {
    const onValueChange = jest.fn()
    render(<DateRangePicker today="2026-10-24" onValueChange={onValueChange} />)
    expect(screen.getByRole("group", { name: "Date range" })).toBeInTheDocument()
    fireEvent.change(field("From"), { target: { value: "2026-10-10" } })
    expect(onValueChange).not.toHaveBeenCalled()
    fireEvent.change(field("To"), { target: { value: "2026-10-01" } })
    expect(onValueChange).not.toHaveBeenCalled()
    fireEvent.change(field("To"), { target: { value: "2026-10-20" } })
    expect(onValueChange).toHaveBeenCalledWith({
      start: "2026-10-10",
      end: "2026-10-20",
    })
  })

  it("bounds each field by the other", () => {
    render(
      <DateRangePicker
        today="2026-10-24"
        min="2025-04-01"
        max="2026-10-24"
        defaultValue={{ start: "2026-10-01", end: "2026-10-20" }}
      />,
    )
    expect(field("From")).toHaveAttribute("max", "2026-10-20")
    expect(field("To")).toHaveAttribute("min", "2026-10-01")
    expect(field("To")).toHaveAttribute("max", "2026-10-24")
  })

  it("applies presets as pressed toggles and fills the fields", async () => {
    const onValueChange = jest.fn()
    render(<DateRangePicker today="2026-10-24" onValueChange={onValueChange} />)
    const week = screen.getByRole("button", { name: "Last 7 days" })
    expect(week).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(week)
    expect(onValueChange).toHaveBeenLastCalledWith({
      start: "2026-10-18",
      end: "2026-10-24",
    })
    expect(week).toHaveAttribute("aria-pressed", "true")
    expect(field("From").value).toBe("2026-10-18")
    await userEvent.click(screen.getByRole("button", { name: "Last month" }))
    expect(onValueChange).toHaveBeenLastCalledWith({
      start: "2026-09-01",
      end: "2026-09-30",
    })
    await userEvent.click(screen.getByRole("button", { name: "Last month" }))
    expect(onValueChange).toHaveBeenLastCalledWith(null)
  })

  it("disables presets that fall outside min and max", () => {
    render(<DateRangePicker today="2026-10-24" min="2026-10-10" />)
    expect(screen.getByRole("button", { name: "Last 7 days" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Last 30 days" })).toBeDisabled()
  })

  it("computes the built-in ranges in UTC without drifting a day", () => {
    const byLabel = Object.fromEntries(
      dateRangePickerPresets.map((preset) => [
        preset.label,
        preset.range("2026-03-01"),
      ]),
    )
    expect(byLabel["Last month"]).toEqual({ start: "2026-02-01", end: "2026-02-28" })
    expect(byLabel["This month"]).toEqual({ start: "2026-03-01", end: "2026-03-01" })
    expect(byLabel["Year to date"]).toEqual({ start: "2026-01-01", end: "2026-03-01" })
  })
})
