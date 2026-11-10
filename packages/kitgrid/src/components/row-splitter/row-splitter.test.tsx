import { fireEvent, render, screen } from "@testing-library/react"
import { RowSplitter } from "./row-splitter.js"

const renderSplitter = (props: Partial<Parameters<typeof RowSplitter>[0]> = {}) =>
  render(
    <RowSplitter label="Resize chart and table" {...props}>
      <div>Chart</div>
      <div>Table</div>
    </RowSplitter>,
  )

describe("RowSplitter", () => {
  it("exposes a focusable separator that controls the first pane", () => {
    renderSplitter({ defaultValue: 40 })
    const separator = screen.getByRole("separator", { name: "Resize chart and table" })
    expect(separator).toHaveAttribute("tabindex", "0")
    expect(separator).toHaveAttribute("aria-orientation", "vertical")
    expect(separator).toHaveAttribute("aria-valuenow", "40")
    expect(separator).toHaveAttribute("aria-valuemin", "20")
    expect(separator).toHaveAttribute("aria-valuemax", "80")
    const pane = document.getElementById(separator.getAttribute("aria-controls") ?? "")
    expect(pane).toHaveTextContent("Chart")
  })

  it("moves with arrows, jumps with Home and End and resets with Enter", () => {
    const onValueChange = jest.fn()
    const { container } = renderSplitter({ onValueChange })
    const separator = screen.getByRole("separator")
    fireEvent.keyDown(separator, { key: "ArrowRight" })
    expect(separator).toHaveAttribute("aria-valuenow", "52")
    fireEvent.keyDown(separator, { key: "ArrowLeft", shiftKey: true })
    expect(separator).toHaveAttribute("aria-valuenow", "42")
    fireEvent.keyDown(separator, { key: "Home" })
    expect(separator).toHaveAttribute("aria-valuenow", "20")
    fireEvent.keyDown(separator, { key: "End" })
    expect(onValueChange).toHaveBeenLastCalledWith(80)
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue("--_split")).toBe(
      "80%",
    )
    fireEvent.keyDown(separator, { key: "Enter" })
    expect(separator).toHaveAttribute("aria-valuenow", "50")
  })

  it("reports a horizontal separator when stacked and clamps a controlled value", () => {
    renderSplitter({ orientation: "vertical", value: 95, max: 70 })
    const separator = screen.getByRole("separator")
    expect(separator).toHaveAttribute("aria-orientation", "horizontal")
    expect(separator).toHaveAttribute("aria-valuenow", "70")
  })
})
