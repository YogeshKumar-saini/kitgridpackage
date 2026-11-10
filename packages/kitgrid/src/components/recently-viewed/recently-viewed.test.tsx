import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { RecentlyViewed } from "./recently-viewed.js"

const items = [
  { id: "a", name: "Linen shirt", href: "/p/linen", price: 68 },
  { id: "b", name: "Canvas tote", href: "/p/tote", price: 24, compareAt: 32 },
]

describe("RecentlyViewed", () => {
  it("is a titled region of product links", () => {
    render(<RecentlyViewed items={items} />)
    expect(screen.getByRole("region", { name: "Recently viewed" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Linen shirt" })).toHaveAttribute("href", "/p/linen")
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
    expect(screen.getByRole("button", { name: "Scroll back" })).toBeDisabled()
  })

  it("offers clearing and renders nothing when empty", async () => {
    const onClear = jest.fn()
    const { container, rerender } = render(<RecentlyViewed items={items} onClear={onClear} />)
    await userEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(onClear).toHaveBeenCalled()
    rerender(<RecentlyViewed items={[]} onClear={onClear} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe("RecentlyViewed media", () => {
  it("marks items without an image as placeholders", () => {
    const { container } = render(
      <RecentlyViewed
        items={[
          { id: "a", name: "Tote", href: "#", price: 58 },
          { id: "b", name: "Crew", href: "#", price: 120, image: "/b.jpg" },
        ]}
      />,
    )
    const slots = container.querySelectorAll(".kg-recently-viewed__image")
    expect(slots[0]).toHaveAttribute("data-placeholder")
    expect(slots[1]).not.toHaveAttribute("data-placeholder")
  })
})
