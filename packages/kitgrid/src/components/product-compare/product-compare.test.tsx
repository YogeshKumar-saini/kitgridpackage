import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ProductCompare } from "./product-compare.js"

const products = [
  { id: "a", name: "Aero 2", price: 129, specs: { weight: "240 g", waterproof: true, drop: "8 mm" } },
  { id: "b", name: "Trail 5", price: 149, specs: { weight: "290 g", waterproof: true, drop: "8 mm" } },
]
const attributes = [
  { key: "weight", label: "Weight" },
  { key: "waterproof", label: "Waterproof" },
  { key: "drop", label: "Drop" },
]

describe("ProductCompare", () => {
  it("renders products as column headers and attributes as row headers", () => {
    render(<ProductCompare products={products} attributes={attributes} />)
    expect(screen.getByRole("table", { name: "Compare products" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: /Aero 2/ })).toBeInTheDocument()
    expect(screen.getAllByRole("rowheader")).toHaveLength(3)
    expect(screen.getAllByText("Yes")).toHaveLength(2)
    expect(screen.getByRole("rowheader", { name: "Weight" }).parentElement).toHaveAttribute(
      "data-differs",
    )
  })

  it("hides rows that are the same everywhere", async () => {
    render(<ProductCompare products={products} attributes={attributes} />)
    await userEvent.click(screen.getByRole("switch", { name: "Only differences" }))
    expect(screen.getAllByRole("rowheader").map((th) => th.textContent)).toEqual(["Weight"])
  })

  it("removes a product", async () => {
    const onRemove = jest.fn()
    render(<ProductCompare products={products} attributes={attributes} onRemove={onRemove} />)
    await userEvent.click(screen.getByRole("button", { name: "Remove Trail 5 from comparison" }))
    expect(onRemove).toHaveBeenCalledWith("b")
  })
})

describe("ProductCompare media", () => {
  it("marks products without an image as placeholders", () => {
    const { container } = render(
      <ProductCompare
        attributes={[{ key: "fit", label: "Fit" }]}
        products={[
          { id: "a", name: "Crew", price: 120, specs: { fit: "Slim" } },
          { id: "b", name: "Hoodie", price: 88, specs: { fit: "Relaxed" } },
        ]}
      />,
    )
    for (const slot of container.querySelectorAll(".kg-product-compare__image")) {
      expect(slot).toHaveAttribute("data-placeholder")
    }
  })
})
