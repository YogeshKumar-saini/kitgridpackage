import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { SwatchPicker } from "./swatch-picker.js"

const options = [
  { value: "sage", label: "Sage", color: "green" },
  { value: "clay", label: "Clay", color: "brown" },
  { value: "ink", label: "Ink", color: "navy", available: false },
]

describe("SwatchPicker", () => {
  it("is a named group of radios with names that include availability", () => {
    render(<SwatchPicker label="Color" options={options} />)
    expect(screen.getByRole("group", { name: "Color" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Sage" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Ink, sold out" })).toBeInTheDocument()
  })

  it("shows the chosen color name in the legend", async () => {
    const onValueChange = jest.fn()
    render(<SwatchPicker label="Color" options={options} onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole("radio", { name: "Clay" }))
    expect(onValueChange).toHaveBeenCalledWith("clay")
    expect(screen.getByRole("group")).toHaveAccessibleName("Color: Clay")
    expect(screen.getByRole("radio", { name: "Clay" })).toBeChecked()
  })

  it("moves with arrow keys like any radio group", async () => {
    render(<SwatchPicker label="Color" options={options} defaultValue="sage" />)
    screen.getByRole("radio", { name: "Sage" }).focus()
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByRole("radio", { name: "Clay" })).toBeChecked()
  })
})
