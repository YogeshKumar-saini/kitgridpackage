import { render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { SizeGuide, SizeGuideTable } from "./size-guide.js"

const columns = [
  { key: "chest", label: "Chest" },
  { key: "waist", label: "Waist" },
]
const rows = [
  { size: "S", values: { chest: [86, 91] as const, waist: 76 } },
  { size: "M", values: { chest: [96, 101] as const, waist: 81 } },
]

describe("SizeGuideTable", () => {
  it("converts between centimetres and inches", async () => {
    render(<SizeGuideTable columns={columns} rows={rows} highlight="M" locale="en-US" />)
    const table = screen.getByRole("table", { name: "Measurements in cm" })
    expect(within(table).getByRole("cell", { name: "86-91" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("radio", { name: "in" }))
    expect(screen.getByRole("table", { name: "Measurements in in" })).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "33.9-35.8" })).toBeInTheDocument()
    expect(screen.getByRole("rowheader", { name: "M" }).parentElement).toHaveAttribute(
      "aria-current",
      "true",
    )
  })
})

describe("SizeGuide", () => {
  it("opens the table in a titled dialog", async () => {
    render(<SizeGuide columns={columns} rows={rows} />)
    await userEvent.click(screen.getByRole("button", { name: "Size guide" }))
    const dialog = screen.getByRole("dialog", { name: "Size guide" })
    expect(within(dialog).getByRole("table")).toBeInTheDocument()
  })
})
