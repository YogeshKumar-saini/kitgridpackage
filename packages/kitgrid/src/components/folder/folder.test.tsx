import { fireEvent, render, screen } from "@testing-library/react"
import { Folder } from "./folder.js"

describe("Folder", () => {
  it("is a named toggle button with decorative art", () => {
    const { container } = render(<Folder label="Q3 reports" />)
    const button = screen.getByRole("button", { name: "Q3 reports" })
    expect(button).toHaveAttribute("aria-pressed", "false")
    expect(container.querySelector(".kg-folder__art")).toHaveAttribute("aria-hidden", "true")
    expect(container.querySelectorAll(".kg-folder__paper")).toHaveLength(3)
  })

  it("opens on click and reports it", () => {
    const onOpenChange = jest.fn()
    render(<Folder label="Files" onOpenChange={onOpenChange} />)
    const button = screen.getByRole("button")
    fireEvent.click(button)
    expect(button).toHaveAttribute("data-state", "open")
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it("follows a controlled value", () => {
    render(<Folder label="Files" open papers={["A"]} />)
    const button = screen.getByRole("button")
    fireEvent.click(button)
    expect(button).toHaveAttribute("aria-pressed", "true")
  })
})
