import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import { Field } from "../field/field.js"
import { PinInput } from "./pin-input.js"

const cells = () => screen.getAllByRole("textbox")

describe("PinInput", () => {
  it("renders labelled cells with one-time-code autofill on the first", () => {
    render(<PinInput aria-label="Verification code" />)
    expect(screen.getByRole("group", { name: "Verification code" })).toBeInTheDocument()
    const all = cells()
    expect(all).toHaveLength(6)
    expect(all[0]).toHaveAccessibleName("Digit 1 of 6")
    expect(all[5]).toHaveAccessibleName("Digit 6 of 6")
    expect(all[0]).toHaveAttribute("autocomplete", "one-time-code")
    expect(all[1]).toHaveAttribute("autocomplete", "off")
    expect(all[0]).toHaveAttribute("inputmode", "numeric")
  })

  it("auto-advances, rejects invalid characters and completes", async () => {
    const onComplete = jest.fn()
    const onValueChange = jest.fn()
    render(
      <PinInput length={4} onComplete={onComplete} onValueChange={onValueChange} />,
    )
    await userEvent.click(cells()[0] as HTMLElement)
    await userEvent.keyboard("1a2")
    expect(cells()[2]).toHaveFocus()
    expect(onValueChange).toHaveBeenLastCalledWith("12")
    await userEvent.keyboard("34")
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith("1234")
  })

  it("moves focus to the first empty cell instead of leaving gaps", async () => {
    render(<PinInput length={4} />)
    await userEvent.click(cells()[3] as HTMLElement)
    expect(cells()[0]).toHaveFocus()
  })

  it("distributes a pasted code across the cells", async () => {
    const onComplete = jest.fn()
    render(<PinInput onComplete={onComplete} />)
    await userEvent.click(cells()[0] as HTMLElement)
    await userEvent.paste("12-34 56")
    expect(cells().map((cell) => (cell as HTMLInputElement).value)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
    ])
    expect(onComplete).toHaveBeenCalledWith("123456")
  })

  it("deletes backwards with Backspace and navigates with arrows, Home and End", async () => {
    render(<PinInput length={4} defaultValue="123" />)
    const [first, second, third, fourth] = cells() as HTMLInputElement[]
    await userEvent.click(fourth as HTMLElement)
    expect(fourth).toHaveFocus()
    await userEvent.keyboard("{Backspace}")
    expect(third).toHaveFocus()
    expect(third).toHaveValue("")
    await userEvent.keyboard("{ArrowLeft}")
    expect(second).toHaveFocus()
    await userEvent.keyboard("{Home}")
    expect(first).toHaveFocus()
    await userEvent.keyboard("{End}")
    expect(third).toHaveFocus()
  })

  it("accepts letters in alphanumeric mode and can mask", async () => {
    const onValueChange = jest.fn()
    const { container } = render(
      <PinInput length={3} type="alphanumeric" mask onValueChange={onValueChange} />,
    )
    const inputs = container.querySelectorAll("input")
    expect(inputs[0]).toHaveAttribute("type", "password")
    expect(inputs[0]).toHaveAccessibleName("Character 1 of 3")
    await userEvent.click(inputs[0] as HTMLElement)
    await userEvent.keyboard("a9!")
    expect(onValueChange).toHaveBeenLastCalledWith("a9")
  })

  it("follows a controlled value", async () => {
    const Controlled = () => {
      const [code, setCode] = useState("")
      return (
        <>
          <PinInput length={4} value={code} onValueChange={setCode} />
          <button type="button" onClick={() => setCode("")}>
            Reset
          </button>
        </>
      )
    }
    render(<Controlled />)
    await userEvent.click(cells()[0] as HTMLElement)
    await userEvent.keyboard("98")
    expect(cells()[1]).toHaveValue("8")
    await userEvent.click(screen.getByRole("button", { name: "Reset" }))
    expect(cells()[0]).toHaveValue("")
  })

  it("takes invalid state and labelling from a Field", () => {
    const { container } = render(
      <Field label="Code" error="That code has expired">
        <PinInput length={4} />
      </Field>,
    )
    expect(screen.getByRole("group", { name: "Code" })).toBeInTheDocument()
    expect(container.querySelector(".kg-pin-input")).toHaveAttribute("data-invalid")
    for (const cell of cells()) expect(cell).toHaveAttribute("aria-invalid", "true")
  })
})
