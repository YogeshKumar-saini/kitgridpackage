import { act, render, screen, within } from "@testing-library/react"
import { hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { userEvent } from "@testing-library/user-event"
import { CalendarView, type CalendarViewEvent } from "./calendar-view.js"

const today = new Date(2026, 2, 10)
const events: CalendarViewEvent[] = [
  { id: "1", title: "Design review", start: new Date(2026, 2, 10, 14, 0) },
  { id: "2", title: "Offsite", start: new Date(2026, 2, 12), end: new Date(2026, 2, 13), allDay: true },
  { id: "3", title: "1:1", start: new Date(2026, 2, 10, 9, 30) },
]

describe("CalendarView", () => {
  it("renders a labelled month grid with today marked", () => {
    render(<CalendarView events={events} today={today} />)
    const grid = screen.getByRole("grid", { name: "March 2026" })
    const cell = within(grid).getByRole("gridcell", { name: "Tuesday, March 10, 2 events" })
    expect(cell).toHaveAttribute("aria-current", "date")
    expect(cell).toHaveAttribute("tabindex", "0")
    expect(within(grid).getAllByRole("gridcell", { name: /1 event$/ })).toHaveLength(2)
  })

  it("moves focus by day, week and month from the keyboard", async () => {
    const user = userEvent.setup()
    render(<CalendarView events={events} today={today} />)
    within(screen.getByRole("grid")).getByRole("gridcell", { name: /March 10/ }).focus()
    await user.keyboard("{ArrowRight}")
    expect(screen.getByRole("gridcell", { name: /March 11/ })).toHaveFocus()
    await user.keyboard("{ArrowDown}")
    expect(screen.getByRole("gridcell", { name: /March 18/ })).toHaveFocus()
    await user.keyboard("{Home}")
    expect(screen.getByRole("gridcell", { name: /Monday, March 16/ })).toHaveFocus()
    await user.keyboard("{PageDown}")
    expect(screen.getByRole("grid", { name: "April 2026" })).toBeInTheDocument()
    expect(screen.getByRole("gridcell", { name: /April 16/ })).toHaveFocus()
  })

  it("pages months with the toolbar and reports day activation", async () => {
    const user = userEvent.setup()
    const onDayClick = jest.fn()
    render(<CalendarView events={events} today={today} onDayClick={onDayClick} />)
    await user.click(screen.getByRole("button", { name: "Previous month" }))
    expect(screen.getByRole("grid", { name: "February 2026" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Today" }))
    screen.getByRole("gridcell", { name: /March 12/ }).focus()
    await user.keyboard("{Enter}")
    expect((onDayClick.mock.calls[0]?.[0] as Date).getDate()).toBe(12)
  })

  it("lists the week in agenda view, sorted with all-day first", async () => {
    const user = userEvent.setup()
    const onEventClick = jest.fn()
    render(<CalendarView events={events} today={today} onEventClick={onEventClick} />)
    await user.click(screen.getByRole("button", { name: "Week" }))
    expect(screen.getByRole("button", { name: "Week" })).toHaveAttribute("aria-pressed", "true")
    const buttons = screen.getAllByRole("button", { name: /1:1|Design review|Offsite/ })
    expect(buttons.map((b) => b.textContent?.replace(/\s/g, " "))).toHaveLength(4)
    await user.click(screen.getAllByRole("button", { name: /Design review/ })[0] as HTMLElement)
    expect(onEventClick).toHaveBeenCalledWith(events[0])
  })

  it("marks no day on the server and the browser's today after hydration", async () => {
    const html = renderToString(<CalendarView events={[]} defaultDate={today} />)
    expect(html).not.toContain('aria-current="date"')

    jest.useFakeTimers({ now: new Date(2026, 2, 17, 23, 30), doNotFake: ["queueMicrotask", "setTimeout", "setImmediate", "nextTick"] })
    const errors = jest.spyOn(console, "error").mockImplementation(() => {})
    const host = document.createElement("div")
    host.innerHTML = html
    document.body.append(host)
    await act(async () => {
      hydrateRoot(host, <CalendarView events={[]} defaultDate={today} />)
    })
    expect(host.querySelector('[aria-current="date"]')).toHaveAttribute("aria-label", expect.stringMatching(/^Tuesday, March 17/))
    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
    jest.useRealTimers()
    host.remove()
  })
})
