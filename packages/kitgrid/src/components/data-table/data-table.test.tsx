import { fireEvent, render, screen, within } from "@testing-library/react"
import { type DataTableColumn, DataTable } from "./data-table.js"

interface Order {
  id: string
  customer: string
  total: number | null
  placed: string
}

const rows: Order[] = [
  { id: "A-1042", customer: "Priya Raman", total: 182.5, placed: "2026-10-21" },
  { id: "A-1043", customer: "Mateo Alvarez", total: 64, placed: "2026-10-23" },
  { id: "A-1044", customer: "Hana Kobayashi", total: null, placed: "2026-10-19" },
]

const columns: DataTableColumn<Order>[] = [
  { key: "customer", header: "Customer", rowHeader: true },
  { key: "total", header: "Total", type: "currency" },
  { key: "placed", header: "Placed", type: "date", format: { dateStyle: "medium", timeZone: "UTC" } },
]

const bodyRows = () => within(screen.getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole("row")
const firstCells = () => bodyRows().map((row) => within(row).getByRole("rowheader").textContent)

describe("DataTable", () => {
  it("renders a captioned table with formatted, end-aligned numbers", () => {
    render(<DataTable caption="Recent orders" columns={columns} rows={rows} locale="en-US" />)
    expect(screen.getByRole("table", { name: "Recent orders" })).toBeInTheDocument()
    const total = within(bodyRows()[0] as HTMLElement).getAllByRole("cell")[0]
    expect(total).toHaveTextContent("$182.50")
    expect(total).toHaveAttribute("data-align", "end")
    expect(screen.getByRole("rowheader", { name: "Priya Raman" })).toBeInTheDocument()
    expect(screen.getByText("Oct 21, 2026")).toBeInTheDocument()
  })

  it("cycles a sortable header through ascending, descending and unsorted", () => {
    const onSortChange = jest.fn()
    render(
      <DataTable
        sortable
        columns={columns}
        rows={rows}
        locale="en-US"
        onSortChange={onSortChange}
      />,
    )
    const header = screen.getByRole("columnheader", { name: /Total/ })
    const button = within(header).getByRole("button")
    expect(header).toHaveAttribute("aria-sort", "none")

    fireEvent.click(button)
    expect(header).toHaveAttribute("aria-sort", "ascending")
    expect(firstCells()).toEqual(["Mateo Alvarez", "Priya Raman", "Hana Kobayashi"])

    fireEvent.click(button)
    expect(header).toHaveAttribute("aria-sort", "descending")
    // Blank totals stay last in both directions.
    expect(firstCells()).toEqual(["Priya Raman", "Mateo Alvarez", "Hana Kobayashi"])

    fireEvent.click(button)
    expect(header).toHaveAttribute("aria-sort", "none")
    expect(onSortChange).toHaveBeenLastCalledWith(null)
  })

  it("sorts dates and text, and leaves rows alone with manualSort", () => {
    const { rerender } = render(
      <DataTable columns={columns} rows={rows} defaultSort={{ key: "placed", direction: "ascending" }} />,
    )
    expect(firstCells()).toEqual(["Hana Kobayashi", "Priya Raman", "Mateo Alvarez"])
    rerender(
      <DataTable
        columns={columns}
        rows={rows}
        manualSort
        sort={{ key: "customer", direction: "ascending" }}
      />,
    )
    expect(firstCells()).toEqual(["Priya Raman", "Mateo Alvarez", "Hana Kobayashi"])
  })

  it("selects rows one at a time or all at once", () => {
    const onSelectedChange = jest.fn()
    render(
      <DataTable
        selectable
        columns={columns}
        rows={rows}
        defaultSelected={["A-1043"]}
        onSelectedChange={onSelectedChange}
      />,
    )
    const all = screen.getByRole("checkbox", { name: "Select all rows" }) as HTMLInputElement
    expect(all.indeterminate).toBe(true)
    expect(screen.getByRole("checkbox", { name: "Select row A-1043" })).toBeChecked()

    fireEvent.click(all)
    expect(onSelectedChange).toHaveBeenLastCalledWith(["A-1043", "A-1042", "A-1044"])
    expect(all).toBeChecked()

    fireEvent.click(screen.getByRole("checkbox", { name: "Select row A-1042" }))
    expect(onSelectedChange).toHaveBeenLastCalledWith(["A-1043", "A-1044"])
  })

  it("shows the empty slot across every column", () => {
    render(<DataTable selectable columns={columns} rows={[]} empty="No orders yet" />)
    const cell = screen.getByText("No orders yet")
    expect(cell).toHaveAttribute("colspan", "4")
    expect(screen.getByRole("checkbox", { name: "Select all rows" })).toBeDisabled()
  })

  it("becomes a focusable named region when it scrolls on its own", () => {
    render(<DataTable caption="Orders" maxHeight="20rem" columns={columns} rows={rows} />)
    const region = screen.getByRole("region", { name: "Orders" })
    expect(region).toHaveAttribute("tabindex", "0")
    expect(region).toHaveAttribute("data-sticky")
  })
})
