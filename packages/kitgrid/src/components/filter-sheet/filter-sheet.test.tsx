import { act, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { FilterSheet, FilterSheetSection } from "./filter-sheet.js"

describe("FilterSheet", () => {
  it("opens a labelled drawer from a trigger that names the active count", async () => {
    render(
      <FilterSheet activeCount={3} description="Narrow the report">
        <FilterSheetSection title="Brand" count={2} onClear={() => {}}>
          <label>
            <input type="checkbox" /> Linen Co
          </label>
        </FilterSheetSection>
      </FilterSheet>,
    )
    const trigger = screen.getByRole("button", { name: "Filters, 3 active" })
    await userEvent.click(trigger)
    const sheet = screen.getByRole("dialog", { name: "Filters" })
    expect(sheet).toHaveAccessibleDescription("Narrow the report")
    expect(sheet).toHaveAttribute("data-side", "right")
    expect(screen.getByRole("region", { name: "Brand" })).toBeInTheDocument()
    expect(screen.getByText("3 active")).toBeInTheDocument()
  })

  it("applies and closes, resets while anything is active, and clears a section", async () => {
    const onApply = jest.fn()
    const onReset = jest.fn()
    const onClear = jest.fn()
    const onOpenChange = jest.fn()
    const { rerender } = render(
      <FilterSheet
        defaultOpen
        activeCount={1}
        onApply={onApply}
        onReset={onReset}
        onOpenChange={onOpenChange}
      >
        <FilterSheetSection title="Region" count={1} onClear={onClear}>
          <span>North</span>
        </FilterSheetSection>
      </FilterSheet>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Clear Region" }))
    expect(onClear).toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Reset" }))
    expect(onReset).toHaveBeenCalled()
    await act(async () => {
      screen.getByRole("button", { name: "Apply filters" }).click()
    })
    expect(onApply).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenLastCalledWith(false)

    rerender(
      <FilterSheet open activeCount={0} onReset={onReset}>
        <span>Nothing</span>
      </FilterSheet>,
    )
    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument()
  })
})
