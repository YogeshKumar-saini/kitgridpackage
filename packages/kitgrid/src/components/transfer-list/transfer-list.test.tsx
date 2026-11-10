import { render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { TransferList, type TransferListOption } from "./transfer-list.js"

const columns: TransferListOption[] = [
  { value: "sku", label: "SKU" },
  { value: "price", label: "Price" },
  { value: "stock", label: "Stock" },
  { value: "vendor", label: "Vendor", disabled: true },
]

const list = (name: string) => screen.getByRole("listbox", { name })

describe("TransferList", () => {
  it("splits options between two multi-select listboxes", () => {
    render(<TransferList options={columns} defaultValue={["price"]} />)
    expect(list("Available")).toHaveAttribute("aria-multiselectable", "true")
    expect(within(list("Available")).getAllByRole("option")).toHaveLength(3)
    expect(within(list("Selected")).getByRole("option", { name: "Price" })).toBeInTheDocument()
  })

  it("checks with clicks and moves with the button", async () => {
    const onValueChange = jest.fn()
    render(<TransferList options={columns} onValueChange={onValueChange} />)
    const move = screen.getByRole("button", { name: "Move to selected" })
    expect(move).toBeDisabled()
    await userEvent.click(screen.getByRole("option", { name: "SKU" }))
    await userEvent.click(screen.getByRole("option", { name: "Stock" }))
    await userEvent.click(move)
    expect(onValueChange).toHaveBeenLastCalledWith(["sku", "stock"])
    expect(within(list("Selected")).getAllByRole("option")).toHaveLength(2)
  })

  it("checks with Space and moves with Enter from the keyboard", async () => {
    const onValueChange = jest.fn()
    render(<TransferList options={columns} defaultValue={["sku"]} onValueChange={onValueChange} />)
    list("Selected").focus()
    await userEvent.keyboard(" {Enter}")
    expect(onValueChange).toHaveBeenLastCalledWith([])
  })

  it("selects every enabled item with the header checkbox", async () => {
    render(<TransferList options={columns} />)
    await userEvent.click(screen.getByRole("checkbox", { name: "Available: select all" }))
    const options = within(list("Available")).getAllByRole("option")
    expect(options.filter((o) => o.getAttribute("aria-selected") === "true")).toHaveLength(3)
  })

  it("filters each list when searchable", async () => {
    render(<TransferList options={columns} searchable />)
    await userEvent.type(screen.getByRole("searchbox", { name: "Filter Available" }), "st")
    expect(within(list("Available")).getAllByRole("option")).toHaveLength(1)
  })
})
