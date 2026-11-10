import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Field } from "../field/field.js"
import { SwitchGroup, type SwitchGroupOption } from "./switch-group.js"

const alerts: SwitchGroupOption[] = [
  { value: "orders", label: "Order updates" },
  { value: "restock", label: "Restock alerts", description: "When saved items return" },
  { value: "sms", label: "Text messages", disabled: true },
]

describe("SwitchGroup", () => {
  it("renders a named group of switches", () => {
    render(<SwitchGroup label="Notifications" options={alerts} defaultValue={["orders"]} />)
    expect(screen.getByRole("group", { name: "Notifications" })).toBeInTheDocument()
    expect(screen.getByRole("switch", { name: "Order updates" })).toBeChecked()
    expect(screen.getByRole("switch", { name: "Restock alerts" })).toHaveAccessibleDescription(
      "When saved items return",
    )
    expect(screen.getByRole("switch", { name: "Text messages" })).toBeDisabled()
  })

  it("reports every switch that is on", async () => {
    const onValueChange = jest.fn()
    render(<SwitchGroup label="Notifications" options={alerts} onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole("switch", { name: "Restock alerts" }))
    await userEvent.click(screen.getByRole("switch", { name: "Order updates" }))
    expect(onValueChange).toHaveBeenLastCalledWith(["restock", "orders"])
  })

  it("takes its name from a surrounding Field without stealing the field id", () => {
    render(
      <Field label="Email me about">
        <SwitchGroup options={alerts} />
      </Field>,
    )
    expect(screen.getByRole("group", { name: "Email me about" })).toBeInTheDocument()
    const ids = screen.getAllByRole("switch").map((el) => el.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
