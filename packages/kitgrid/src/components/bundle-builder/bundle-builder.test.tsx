import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { BundleBuilder } from "./bundle-builder.js"

const items = [
  { id: "shirt", name: "Linen shirt", price: 68, anchor: true },
  { id: "belt", name: "Leather belt", price: 42 },
  { id: "socks", name: "Wool socks", price: 18 },
]

describe("BundleBuilder", () => {
  it("selects everything by default and applies the bundle discount", () => {
    render(<BundleBuilder items={items} discount={10} />)
    expect(screen.getByRole("region", { name: "Frequently bought together" })).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: /Linen shirt/ })).toBeDisabled()
    expect(screen.getByText("You save $12.80")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add 3 to cart" })).toBeInTheDocument()
  })

  it("updates the total and reports the chosen ids", async () => {
    const onAdd = jest.fn()
    render(<BundleBuilder items={items} discount={10} onAdd={onAdd} />)
    await userEvent.click(screen.getByRole("checkbox", { name: "Leather belt" }))
    await userEvent.click(screen.getByRole("checkbox", { name: "Wool socks" }))
    expect(screen.queryByText(/You save/)).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Add to cart" }))
    expect(onAdd).toHaveBeenCalledWith(["shirt"])
  })
})

describe("BundleBuilder media", () => {
  it("marks items without an image as placeholders", () => {
    const { container } = render(
      <BundleBuilder
        items={[
          { id: "a", name: "Sneaker", price: 145, anchor: true },
          { id: "b", name: "Tee", price: 42, image: "/tee.jpg" },
        ]}
      />,
    )
    const slots = container.querySelectorAll(".kg-bundle-builder__image")
    expect(slots[0]).toHaveAttribute("data-placeholder")
    expect(slots[1]).not.toHaveAttribute("data-placeholder")
  })
})
