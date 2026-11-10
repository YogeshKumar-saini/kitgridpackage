import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Autocomplete } from "./autocomplete.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

const streets = ["Baker Street", "Bakery Lane", "Abbey Road", "Carnaby Street"]

describe("Autocomplete", () => {
  it("keeps free text as the value", async () => {
    const onValueChange = jest.fn()
    render(
      <Autocomplete aria-label="Street" suggestions={streets} onValueChange={onValueChange} />,
    )
    await userEvent.type(screen.getByRole("combobox", { name: "Street" }), "Main")
    expect(onValueChange).toHaveBeenLastCalledWith("Main")
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })

  it("suggests matches and fills one in with the keyboard", async () => {
    const onSelect = jest.fn()
    render(<Autocomplete aria-label="Street" suggestions={streets} onSelect={onSelect} />)
    const input = screen.getByRole("combobox")
    await userEvent.type(input, "bak")
    expect(screen.getAllByRole("option")).toHaveLength(2)
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}")
    expect(onSelect).toHaveBeenCalledWith("Bakery Lane")
    expect(input).toHaveValue("Bakery Lane")
  })

  it("accepts the inline completion with Tab", async () => {
    render(<Autocomplete aria-label="Street" suggestions={streets} inlineComplete />)
    const input = screen.getByRole("combobox")
    expect(input).toHaveAttribute("aria-autocomplete", "both")
    await userEvent.type(input, "Abb")
    await userEvent.tab()
    expect(input).toHaveValue("Abbey Road")
    expect(input).toHaveFocus()
  })

  it("closes on Escape, then clears", async () => {
    render(<Autocomplete aria-label="Street" suggestions={streets} />)
    const input = screen.getByRole("combobox")
    await userEvent.type(input, "Car")
    await userEvent.keyboard("{Escape}")
    expect(input).toHaveAttribute("aria-expanded", "false")
    await userEvent.keyboard("{Escape}")
    expect(input).toHaveValue("")
  })
})
