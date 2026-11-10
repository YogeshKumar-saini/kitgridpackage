import { fireEvent, render, screen, within } from "@testing-library/react"
import { FilterBar } from "./filter-bar.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

const filters = [
  { id: "region", label: "Region", value: "North, West" },
  { id: "channel", label: "Channel", value: "Online", local: true },
]

const scopes = [
  { value: "all", label: "All stores" },
  { value: "flagship", label: "Flagship stores" },
]

describe("FilterBar", () => {
  it("lists applied filters with named remove buttons", () => {
    const onRemove = jest.fn()
    render(<FilterBar filters={filters} onRemove={onRemove} />)
    const list = screen.getByRole("list", { name: "Active filters" })
    expect(within(list).getAllByRole("listitem")).toHaveLength(2)
    fireEvent.click(screen.getByRole("button", { name: "Remove Channel: Online" }))
    expect(onRemove).toHaveBeenCalledWith("channel")
  })

  it("offers reset only while something is applied", () => {
    const onReset = jest.fn()
    const { rerender } = render(<FilterBar filters={filters} onReset={onReset} />)
    fireEvent.click(screen.getByRole("button", { name: "Reset" }))
    expect(onReset).toHaveBeenCalled()
    rerender(<FilterBar filters={[]} onReset={onReset} />)
    expect(screen.queryByRole("button", { name: "Reset" })).toBeNull()
  })

  it("picks a scope from its menu", () => {
    const onScopeChange = jest.fn()
    render(
      <FilterBar
        filters={[]}
        scopes={scopes}
        scopeLabel="Store"
        onScopeChange={onScopeChange}
        onReset={() => {}}
      />,
    )
    const trigger = screen.getByRole("button", { name: /Store\s*All stores/ })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Flagship stores" }))
    expect(onScopeChange).toHaveBeenCalledWith("flagship")
    expect(screen.getByRole("button", { name: /Flagship stores/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument()
  })
})
