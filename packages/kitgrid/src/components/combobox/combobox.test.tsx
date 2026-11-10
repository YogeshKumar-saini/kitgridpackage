import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Field } from "../field/field.js"
import { Combobox, type ComboboxOption } from "./combobox.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

const cities: ComboboxOption[] = [
  { value: "lis", label: "Lisbon" },
  { value: "lon", label: "London" },
  { value: "lim", label: "Lima", disabled: true },
  { value: "osa", label: "Osaka" },
]

const active = () => {
  const id = screen.getByRole("combobox").getAttribute("aria-activedescendant")
  return id ? document.getElementById(id) : null
}

const renderCity = (props: Partial<Parameters<typeof Combobox>[0]> = {}) =>
  render(
    <Field label="City">
      <Combobox options={cities} {...props} />
    </Field>,
  )

describe("Combobox", () => {
  it("is an editable combobox named by its field", () => {
    renderCity()
    const input = screen.getByRole("combobox", { name: "City" })
    expect(input).toHaveAttribute("aria-autocomplete", "list")
    expect(input).toHaveAttribute("aria-expanded", "false")
  })

  it("filters as you type and highlights the first match", async () => {
    renderCity()
    await userEvent.type(screen.getByRole("combobox"), "lo")
    const list = screen.getByRole("listbox", { name: "City" })
    expect(list.querySelectorAll('[role="option"]')).toHaveLength(1)
    expect(active()).toHaveTextContent("London")
  })

  it("skips disabled options with the arrow keys and commits with Enter", async () => {
    const onValueChange = jest.fn()
    renderCity({ onValueChange })
    const input = screen.getByRole("combobox")
    input.focus()
    await userEvent.keyboard("{ArrowDown}")
    expect(active()).toHaveTextContent("Lisbon")
    await userEvent.keyboard("{ArrowDown}{ArrowDown}")
    expect(active()).toHaveTextContent("Osaka")
    await userEvent.keyboard("{Enter}")
    expect(onValueChange).toHaveBeenCalledWith("osa")
    expect(input).toHaveValue("Osaka")
    expect(input).toHaveAttribute("aria-expanded", "false")
  })

  it("shows the empty message when nothing matches", async () => {
    renderCity({ emptyMessage: "No city" })
    await userEvent.type(screen.getByRole("combobox"), "zzz")
    expect(screen.getByText("No city")).toBeInTheDocument()
  })

  it("restores the selected label on Escape and clears on a second Escape", async () => {
    const onValueChange = jest.fn()
    renderCity({ defaultValue: "lis", clearable: true, onValueChange })
    const input = screen.getByRole("combobox")
    await userEvent.clear(input)
    await userEvent.type(input, "Os")
    await userEvent.keyboard("{Escape}")
    expect(input).toHaveValue("Lisbon")
    await userEvent.keyboard("{Escape}")
    expect(onValueChange).toHaveBeenCalledWith(null)
    expect(input).toHaveValue("")
  })

  it("selects with the pointer", async () => {
    renderCity()
    await userEvent.click(screen.getByRole("combobox"))
    await userEvent.click(screen.getByRole("option", { name: "London" }))
    expect(screen.getByRole("combobox")).toHaveValue("London")
  })
})
