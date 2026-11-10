import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { hexToHsv, hsvToHex } from "./color.js"
import { ColorPicker } from "./color-picker.js"

describe("color math", () => {
  it("round-trips hex through HSV", () => {
    for (const hex of ["#e8742a", "#000000", "#ffffff", "#3b82f6"]) {
      const hsv = hexToHsv(hex)
      expect(hsv && hsvToHex(hsv, false)).toBe(hex)
    }
    expect(hexToHsv("#f00")).toMatchObject({ h: 0, s: 1, v: 1 })
    expect(hexToHsv("nope")).toBeNull()
  })
})

describe("ColorPicker", () => {
  it("exposes the area and hue as sliders with spoken values", () => {
    render(<ColorPicker defaultValue="#ff0000" />)
    expect(
      screen.getByRole("slider", { name: "Saturation and brightness" }),
    ).toHaveAttribute("aria-valuetext", "Saturation 100%, brightness 100%")
    expect(screen.getByRole("slider", { name: "Hue" })).toHaveAttribute("aria-valuenow", "0")
    expect(screen.queryByRole("slider", { name: "Opacity" })).not.toBeInTheDocument()
  })

  it("moves the hue with the arrow keys", async () => {
    const onValueChange = jest.fn()
    render(<ColorPicker defaultValue="#ff0000" onValueChange={onValueChange} />)
    screen.getByRole("slider", { name: "Hue" }).focus()
    await userEvent.keyboard("{Shift>}{ArrowRight}{ArrowRight}{/Shift}{ArrowRight}{ArrowRight}")
    // 22 degrees of hue from pure red.
    expect(screen.getByRole("slider", { name: "Hue" })).toHaveAttribute("aria-valuenow", "22")
    expect(onValueChange).toHaveBeenLastCalledWith("#ff5e00")
  })

  it("darkens with ArrowDown on the area", async () => {
    const onValueChange = jest.fn()
    render(<ColorPicker defaultValue="#ffffff" onValueChange={onValueChange} />)
    screen.getByRole("slider", { name: "Saturation and brightness" }).focus()
    await userEvent.keyboard("{PageDown}")
    expect(onValueChange).toHaveBeenLastCalledWith("#e6e6e6")
  })

  it("accepts a typed hex on Enter and ignores invalid input", async () => {
    const onValueChange = jest.fn()
    render(<ColorPicker defaultValue="#000000" onValueChange={onValueChange} />)
    const input = screen.getByRole("textbox", { name: "Hex" })
    await userEvent.clear(input)
    await userEvent.type(input, "zz{Enter}")
    expect(onValueChange).not.toHaveBeenCalled()
    await userEvent.clear(input)
    await userEvent.type(input, "3b82f6{Enter}")
    expect(onValueChange).toHaveBeenLastCalledWith("#3b82f6")
    expect(input).toHaveValue("#3B82F6")
  })

  it("reports 8-digit hex with alpha", () => {
    const onValueChange = jest.fn()
    render(<ColorPicker alpha defaultValue="#336699" onValueChange={onValueChange} />)
    const slider = screen.getByRole("slider", { name: "Opacity" })
    fireEvent.keyDown(slider, { key: "Home" })
    expect(onValueChange).toHaveBeenLastCalledWith("#33669900")
  })

  it("picks presets and marks the current one", async () => {
    render(<ColorPicker defaultValue="#000000" swatches={["#1f2937", "#e8742a"]} />)
    const preset = screen.getByRole("button", { name: "#E8742A" })
    await userEvent.click(preset)
    expect(preset).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("textbox", { name: "Hex" })).toHaveValue("#E8742A")
  })
})
