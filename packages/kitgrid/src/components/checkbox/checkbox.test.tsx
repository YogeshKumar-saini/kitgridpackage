import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { createRef, useState } from "react"
import { Field } from "../field/field.js"
import { Checkbox, CheckboxGroup } from "./checkbox.js"

describe("Checkbox", () => {
  it("is a native checkbox named by its label and described by its description", () => {
    const ref = createRef<HTMLInputElement>()
    render(
      <Checkbox ref={ref} label="Gift wrap" description="Adds a handwritten note." />,
    )
    const box = screen.getByRole("checkbox", { name: "Gift wrap" })
    expect(ref.current).toBe(box)
    expect(box).toHaveAccessibleDescription("Adds a handwritten note.")
  })

  it("toggles uncontrolled with click and Space, reporting each change", async () => {
    const onCheckedChange = jest.fn()
    render(<Checkbox label="Subscribe" onCheckedChange={onCheckedChange} />)
    const box = screen.getByRole("checkbox")
    await userEvent.click(screen.getByText("Subscribe"))
    expect(box).toBeChecked()
    box.focus()
    await userEvent.keyboard(" ")
    expect(box).not.toBeChecked()
    expect(onCheckedChange.mock.calls).toEqual([[true], [false]])
  })

  it("stays in sync with a controlled checked prop", async () => {
    const Controlled = () => {
      const [checked, setChecked] = useState(false)
      return (
        <>
          <Checkbox label="Terms" checked={checked} onCheckedChange={setChecked} />
          <output>{String(checked)}</output>
        </>
      )
    }
    render(<Controlled />)
    await userEvent.click(screen.getByRole("checkbox"))
    expect(screen.getByRole("checkbox")).toBeChecked()
    expect(screen.getByText("true")).toBeInTheDocument()
  })

  it("exposes the indeterminate state as mixed", () => {
    render(<Checkbox label="Select all" indeterminate />)
    expect(screen.getByRole("checkbox")).toBePartiallyChecked()
  })

  it("takes its id and error wiring from a Field", () => {
    render(
      <Field label="Agreement" error="You must accept">
        <Checkbox label="I accept" />
      </Field>,
    )
    const box = screen.getByRole("checkbox")
    expect(box).toHaveAttribute("aria-invalid", "true")
    expect(box).toHaveAccessibleDescription("You must accept")
  })
})

describe("CheckboxGroup", () => {
  it("renders a fieldset named by its legend and tracks the checked values", async () => {
    const onValueChange = jest.fn()
    render(
      <CheckboxGroup label="Sizes" defaultValue={["m"]} onValueChange={onValueChange}>
        <Checkbox value="s" label="Small" />
        <Checkbox value="m" label="Medium" />
        <Checkbox value="l" label="Large" />
      </CheckboxGroup>,
    )
    expect(screen.getByRole("group", { name: "Sizes" })).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "Medium" })).toBeChecked()
    await userEvent.click(screen.getByRole("checkbox", { name: "Large" }))
    await userEvent.click(screen.getByRole("checkbox", { name: "Medium" }))
    expect(onValueChange.mock.calls).toEqual([[["m", "l"]], [["l"]]])
  })

  it("is fully controlled by value", async () => {
    const onValueChange = jest.fn()
    render(
      <CheckboxGroup label="Colors" value={["red"]} onValueChange={onValueChange}>
        <Checkbox value="red" label="Red" />
        <Checkbox value="blue" label="Blue" />
      </CheckboxGroup>,
    )
    await userEvent.click(screen.getByRole("checkbox", { name: "Blue" }))
    expect(onValueChange).toHaveBeenCalledWith(["red", "blue"])
    expect(screen.getByRole("checkbox", { name: "Blue" })).not.toBeChecked()
  })

  it("disables every checkbox and shares the name", () => {
    render(
      <CheckboxGroup label="Extras" name="extras" disabled>
        <Checkbox value="a" label="A" />
        <Checkbox value="b" label="B" />
      </CheckboxGroup>,
    )
    for (const box of screen.getAllByRole("checkbox")) {
      expect(box).toBeDisabled()
      expect(box).toHaveAttribute("name", "extras")
    }
  })

  it("doesn't let its checkboxes claim a surrounding Field's id", () => {
    render(
      <Field label="Toppings" controlId="toppings">
        <CheckboxGroup>
          <Checkbox value="a" label="Olives" />
          <Checkbox value="b" label="Peppers" />
        </CheckboxGroup>
      </Field>,
    )
    expect(screen.getByRole("group", { name: "Toppings" })).toBeInTheDocument()
    for (const box of screen.getAllByRole("checkbox")) {
      expect(box).not.toHaveAttribute("id", "toppings")
    }
  })
})
