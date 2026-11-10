import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import { Field } from "../field/field.js"
import { RadioGroup, RadioGroupItem } from "./radio-group.js"

type Plan = "starter" | "pro" | "team"

const Plans = (props: Partial<Parameters<typeof RadioGroup<Plan>>[0]>) => (
  <RadioGroup<Plan> aria-label="Plan" {...props}>
    <RadioGroupItem value="starter" label="Starter" description="For individuals" />
    <RadioGroupItem value="pro" label="Pro" description="For growing shops" />
    <RadioGroupItem value="team" label="Team" disabled />
  </RadioGroup>
)

describe("RadioGroup", () => {
  it("renders a named radiogroup of native radios sharing one name", () => {
    render(<Plans name="plan" />)
    expect(screen.getByRole("radiogroup", { name: "Plan" })).toHaveAttribute(
      "aria-orientation",
      "vertical",
    )
    const radios = screen.getAllByRole("radio")
    expect(radios).toHaveLength(3)
    for (const radio of radios) expect(radio).toHaveAttribute("name", "plan")
  })

  it("names each item by its label only and describes it by its description", () => {
    render(<Plans variant="card" />)
    const pro = screen.getByRole("radio", { name: "Pro" })
    expect(pro).toHaveAccessibleDescription("For growing shops")
  })

  it("selects on click and reports the typed value", async () => {
    const onValueChange = jest.fn<(value: Plan) => void>()
    render(<Plans defaultValue="starter" onValueChange={onValueChange} />)
    expect(screen.getByRole("radio", { name: "Starter" })).toBeChecked()
    await userEvent.click(screen.getByText("Pro"))
    expect(screen.getByRole("radio", { name: "Pro" })).toBeChecked()
    expect(onValueChange).toHaveBeenCalledWith("pro")
  })

  it("moves selection with arrow keys", async () => {
    render(<Plans defaultValue="starter" />)
    screen.getByRole("radio", { name: "Starter" }).focus()
    await userEvent.keyboard("{ArrowDown}")
    expect(screen.getByRole("radio", { name: "Pro" })).toBeChecked()
    expect(screen.getByRole("radio", { name: "Pro" })).toHaveFocus()
  })

  it("follows a controlled value, including none", async () => {
    const Controlled = () => {
      const [value, setValue] = useState<Plan | null>(null)
      return (
        <>
          <Plans value={value} onValueChange={setValue} />
          <button type="button" onClick={() => setValue(null)}>
            Reset
          </button>
        </>
      )
    }
    render(<Controlled />)
    for (const radio of screen.getAllByRole("radio")) expect(radio).not.toBeChecked()
    await userEvent.click(screen.getByRole("radio", { name: "Starter" }))
    expect(screen.getByRole("radio", { name: "Starter" })).toBeChecked()
    await userEvent.click(screen.getByRole("button", { name: "Reset" }))
    expect(screen.getByRole("radio", { name: "Starter" })).not.toBeChecked()
  })

  it("disables individual items and the whole group", () => {
    const { rerender } = render(<Plans />)
    expect(screen.getByRole("radio", { name: "Team" })).toBeDisabled()
    expect(screen.getByRole("radio", { name: "Pro" })).toBeEnabled()
    rerender(<Plans disabled />)
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled()
  })

  it("is labelled, required and marked invalid by a Field", () => {
    render(
      <Field label="Shipping speed" error="Choose a speed" required>
        <RadioGroup>
          <RadioGroupItem value="standard" label="Standard" />
          <RadioGroupItem value="express" label="Express" />
        </RadioGroup>
      </Field>,
    )
    const group = screen.getByRole("radiogroup", { name: /Shipping speed/ })
    expect(group).toHaveAttribute("aria-invalid", "true")
    expect(group).toHaveAttribute("aria-required", "true")
    expect(group).toHaveAccessibleDescription("Choose a speed")
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeRequired()
  })
})
