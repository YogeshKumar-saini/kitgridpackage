import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ModeToggle } from "./mode-toggle.js"

const readStylesheet = async (file: string): Promise<string> => {
  const fs = (await import("node:fs")) as {
    readFileSync: (path: string, encoding: "utf8") => string
  }
  return fs.readFileSync(`${__dirname}/${file}`, "utf8")
}

describe("ModeToggle", () => {
  it("cycles light, dark, system and names the current mode", async () => {
    const onValueChange = jest.fn()
    render(<ModeToggle defaultValue="light" onValueChange={onValueChange} />)
    const button = screen.getByRole("button", { name: "Color mode: Light" })
    await userEvent.click(button)
    expect(onValueChange).toHaveBeenLastCalledWith("dark")
    expect(button).toHaveAccessibleName("Color mode: Dark")
    await userEvent.click(button)
    await userEvent.click(button)
    expect(onValueChange).toHaveBeenLastCalledWith("light")
  })

  it("offers all three as a radio group when segmented", async () => {
    const onValueChange = jest.fn()
    render(<ModeToggle variant="segmented" onValueChange={onValueChange} />)
    expect(screen.getByRole("radiogroup", { name: "Color mode" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "System" })).toBeChecked()
    await userEvent.click(screen.getByRole("radio", { name: "Dark" }))
    expect(onValueChange).toHaveBeenLastCalledWith("dark")
  })

  it("gives the cycle glyph a box and lets its svg fill it", async () => {
    const { container } = render(<ModeToggle />)
    expect(container.querySelector(".kg-mode-toggle__glyph svg")).not.toBeNull()
    expect(container.querySelector(".kg-mode-toggle__glyph")).toHaveClass("size-[55%]", "[--_icon-size:100%]")
    const css = await readStylesheet("./mode-toggle.css")
    expect(css).not.toContain("svg")
  })
})
