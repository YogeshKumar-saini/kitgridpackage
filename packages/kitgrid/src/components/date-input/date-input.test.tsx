import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import { DateInput } from "./date-input.js"

describe("DateInput", () => {
  it("is a native date field that reports yyyy-mm-dd values", () => {
    const onValueChange = jest.fn()
    const { container } = render(
      <DateInput
        aria-label="Invoice day"
        min="2026-01-01"
        onValueChange={onValueChange}
      />,
    )
    const input = container.querySelector("input") as HTMLInputElement
    expect(input).toHaveAttribute("type", "date")
    expect(input).toHaveAccessibleName("Invoice day")
    expect(input).toHaveAttribute("min", "2026-01-01")
    fireEvent.change(input, { target: { value: "2026-03-14" } })
    expect(onValueChange).toHaveBeenCalledWith("2026-03-14")
  })

  it("clears with the clear button and reports an empty string", async () => {
    const onValueChange = jest.fn()
    const Controlled = () => {
      const [value, setValue] = useState("2026-03-14")
      return (
        <DateInput
          aria-label="Invoice day"
          value={value}
          onValueChange={(next) => {
            setValue(next)
            onValueChange(next)
          }}
        />
      )
    }
    const { container } = render(<Controlled />)
    await userEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(onValueChange).toHaveBeenLastCalledWith("")
    expect((container.querySelector("input") as HTMLInputElement).value).toBe("")
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull()
  })

  it("can drop the clear button", () => {
    render(<DateInput aria-label="Day" defaultValue="2026-03-14" clearable={false} />)
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull()
  })
})
