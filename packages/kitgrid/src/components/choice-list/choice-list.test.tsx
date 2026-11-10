import { fireEvent, render, screen } from "@testing-library/react"
import { ChoiceList } from "./choice-list.js"

const options = [
  { value: "csv", label: "CSV", description: "Opens in any spreadsheet" },
  { value: "xlsx", label: "Excel workbook", aside: "Pro" },
  { value: "pdf", label: "PDF report", disabled: true },
] as const

describe("ChoiceList", () => {
  it("is a named radio group of native radios with descriptions", () => {
    render(<ChoiceList label="Export format" options={options} defaultValue="csv" />)
    expect(screen.getByRole("radiogroup", { name: "Export format" })).toBeInTheDocument()
    const csv = screen.getByRole("radio", { name: /^CSV/ })
    expect(csv).toBeChecked()
    expect(csv).toHaveAccessibleDescription("Opens in any spreadsheet")
    expect(screen.getByRole("radio", { name: /PDF report/ })).toBeDisabled()
  })

  it("selects on click and reports the value", () => {
    const onValueChange = jest.fn()
    render(<ChoiceList label="Export format" options={options} onValueChange={onValueChange} />)
    const excel = screen.getByRole("radio", { name: /Excel workbook/ })
    fireEvent.click(excel)
    expect(excel).toBeChecked()
    expect(excel.closest("label")).toHaveAttribute("data-checked")
    expect(onValueChange).toHaveBeenCalledWith("xlsx")
  })

  it("follows a controlled value", () => {
    const { rerender } = render(<ChoiceList options={options} value="csv" />)
    fireEvent.click(screen.getByRole("radio", { name: /Excel/ }))
    expect(screen.getByRole("radio", { name: /CSV/ })).toBeChecked()
    rerender(<ChoiceList options={options} value="xlsx" />)
    expect(screen.getByRole("radio", { name: /Excel/ })).toBeChecked()
  })
})
