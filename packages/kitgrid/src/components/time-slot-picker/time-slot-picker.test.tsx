import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { TimeSlotPicker } from "./time-slot-picker.js"

const slots = [
  { value: "09:00" },
  { value: "09:30", disabled: true },
  { value: "10:00" },
  { value: "10:30" },
]

describe("TimeSlotPicker", () => {
  it("is a named radio group with taken slots disabled", () => {
    render(<TimeSlotPicker label="Pickup time" slots={slots} />)
    expect(screen.getByRole("radiogroup", { name: "Pickup time" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "09:30" })).toBeDisabled()
  })

  it("picks with a click and moves with the arrow keys, skipping taken slots", async () => {
    const onValueChange = jest.fn()
    render(<TimeSlotPicker label="Pickup time" slots={slots} onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole("radio", { name: "09:00" }))
    expect(onValueChange).toHaveBeenLastCalledWith("09:00")
    await userEvent.keyboard("{ArrowRight}")
    expect(onValueChange).toHaveBeenLastCalledWith("10:00")
  })
})
