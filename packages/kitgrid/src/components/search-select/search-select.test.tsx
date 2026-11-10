import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { SearchSelect, type SearchSelectOption } from "./search-select.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

const zones: SearchSelectOption[] = [
  { value: "Europe/Lisbon", label: "Lisbon", aside: "UTC+0" },
  { value: "Europe/Berlin", label: "Berlin", aside: "UTC+1" },
  { value: "Asia/Tokyo", label: "Tokyo", aside: "UTC+9", keywords: ["Japan"] },
]

describe("SearchSelect", () => {
  it("opens with a focused search box", async () => {
    render(<SearchSelect aria-label="Time zone" options={zones} />)
    const trigger = screen.getByRole("button", { name: /^Time zone/ })
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox")
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("combobox", { name: "Search" })).toHaveFocus()
    expect(screen.getAllByRole("option")).toHaveLength(3)
  })

  it("filters by label and hidden keywords, then picks with Enter", async () => {
    const onValueChange = jest.fn()
    render(<SearchSelect aria-label="Time zone" options={zones} onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole("button"))
    await userEvent.keyboard("japan")
    expect(screen.getAllByRole("option")).toHaveLength(1)
    await userEvent.keyboard("{Enter}")
    expect(onValueChange).toHaveBeenCalledWith("Asia/Tokyo")
    expect(screen.getByRole("button")).toHaveFocus()
    expect(screen.getByRole("button")).toHaveTextContent("Tokyo")
  })

  it("closes on Escape and returns focus to the trigger", async () => {
    render(<SearchSelect aria-label="Time zone" options={zones} />)
    await userEvent.click(screen.getByRole("button"))
    await userEvent.keyboard("{Escape}")
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByRole("button")).toHaveFocus()
  })

  it("opens from the keyboard with ArrowDown", async () => {
    render(<SearchSelect aria-label="Time zone" options={zones} defaultValue="Europe/Berlin" />)
    screen.getByRole("button").focus()
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}")
    expect(screen.getByRole("button")).toHaveTextContent("Tokyo")
  })
})
