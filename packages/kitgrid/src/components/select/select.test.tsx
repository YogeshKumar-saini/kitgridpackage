import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import { Field } from "../field/field.js"
import { Select, type SelectGroup, type SelectOption } from "./select.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

const sizes: SelectOption[] = [
  { value: "xs", label: "Extra small" },
  { value: "s", label: "Small", disabled: true },
  { value: "m", label: "Medium", description: "Fits most" },
  { value: "l", label: "Large" },
  { value: "xl", label: "Extra large" },
]

const Sized = (props: Partial<Parameters<typeof Select>[0]>) => (
  <>
    <label htmlFor="size">Size</label>
    <Select id="size" options={sizes} placeholder="Choose a size" {...props} />
  </>
)

const activeOption = () => {
  const combobox = screen.getByRole("combobox")
  const id = combobox.getAttribute("aria-activedescendant")
  return id ? document.getElementById(id) : null
}

describe("Select", () => {
  it("renders a labelled select-only combobox showing the placeholder", () => {
    render(<Sized />)
    const combobox = screen.getByRole("combobox", { name: "Size" })
    expect(combobox).toHaveAttribute("aria-haspopup", "listbox")
    expect(combobox).toHaveAttribute("aria-expanded", "false")
    expect(combobox).toHaveTextContent("Choose a size")
  })

  it("opens with ArrowDown and moves the active option without moving focus", async () => {
    render(<Sized />)
    const combobox = screen.getByRole("combobox")
    combobox.focus()
    await userEvent.keyboard("{ArrowDown}")
    expect(screen.getByRole("listbox", { name: "Size" })).toBeInTheDocument()
    expect(combobox).toHaveAttribute("aria-expanded", "true")
    expect(activeOption()).toHaveTextContent("Extra small")
    await userEvent.keyboard("{ArrowDown}")
    expect(activeOption()).toHaveTextContent("Medium")
    await userEvent.keyboard("{End}")
    expect(activeOption()).toHaveTextContent("Extra large")
    await userEvent.keyboard("{ArrowDown}")
    expect(activeOption()).toHaveTextContent("Extra large")
    expect(combobox).toHaveFocus()
  })

  it("selects with Enter and reports the value", async () => {
    const onValueChange = jest.fn()
    render(<Sized onValueChange={onValueChange} />)
    screen.getByRole("combobox").focus()
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}")
    expect(onValueChange).toHaveBeenCalledWith("m")
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    expect(screen.getByRole("combobox")).toHaveTextContent("Medium")
  })

  it("selects with Space without reopening", async () => {
    render(<Sized defaultValue="l" />)
    const combobox = screen.getByRole("combobox")
    combobox.focus()
    await userEvent.keyboard(" ")
    expect(screen.getByRole("listbox")).toBeInTheDocument()
    expect(activeOption()).toHaveTextContent("Large")
    expect(screen.getByRole("option", { name: "Large" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    await userEvent.keyboard("{ArrowUp} ")
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    expect(combobox).toHaveTextContent("Medium")
  })

  it("opens on a typed character and jumps to the match", async () => {
    render(<Sized />)
    screen.getByRole("combobox").focus()
    await userEvent.keyboard("l")
    expect(screen.getByRole("listbox")).toBeInTheDocument()
    expect(activeOption()).toHaveTextContent("Large")
    await userEvent.keyboard("{Escape}")
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    expect(screen.getByRole("combobox")).toHaveTextContent("Choose a size")
  })

  it("picks options with the pointer and ignores disabled ones", async () => {
    const Controlled = () => {
      const [value, setValue] = useState("xs")
      return (
        <>
          <Sized value={value} onValueChange={setValue} />
          <output>{value}</output>
        </>
      )
    }
    render(<Controlled />)
    await userEvent.click(screen.getByRole("combobox"))
    await userEvent.click(screen.getByRole("option", { name: "Small" }))
    expect(screen.getByRole("listbox")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("option", { name: /Extra large/ }))
    expect(screen.getByRole("status")).toHaveTextContent("xl")
    expect(screen.getByRole("combobox")).toHaveFocus()
  })

  it("renders groups and submits through a hidden input", async () => {
    const groups: SelectGroup[] = [
      { label: "Europe", options: [{ value: "fr", label: "France" }] },
      { label: "Asia", options: [{ value: "in", label: "India" }] },
    ]
    const { container } = render(
      <form>
        <Select
          aria-label="Country"
          name="country"
          options={groups}
          defaultValue="in"
        />
      </form>,
    )
    expect(
      container.querySelector<HTMLInputElement>("input[name=country]")?.value,
    ).toBe("in")
    await userEvent.click(screen.getByRole("combobox", { name: "Country" }))
    expect(screen.getByRole("group", { name: "Asia" })).toContainElement(
      screen.getByRole("option", { name: "India" }),
    )
  })

  it("takes its label, description and invalid state from a surrounding Field", () => {
    render(
      <Field label="Shipping speed" description="Arrives in 2–5 days" error="Pick one">
        <Select options={sizes} />
      </Field>,
    )
    const combobox = screen.getByRole("combobox", { name: "Shipping speed" })
    expect(combobox).toHaveAccessibleDescription(/Arrives in 2–5 days/)
    expect(combobox).toHaveAttribute("aria-invalid", "true")
  })

  it("does not open when disabled", async () => {
    render(<Sized disabled />)
    await userEvent.click(screen.getByRole("combobox"))
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })
})
