import { fireEvent, render, screen } from "@testing-library/react"
import { VirtualList } from "./virtual-list.js"

describe("VirtualList", () => {
  it("mounts only the visible window plus overscan", () => {
    render(
      <VirtualList
        count={10_000}
        itemHeight={20}
        height={100}
        overscan={2}
        label="Orders"
        renderItem={(i) => `Order ${i + 1}`}
      />,
    )
    expect(screen.getByRole("list", { name: "Orders" })).toBeInTheDocument()
    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(7)
    expect(items[0]).toHaveAttribute("aria-setsize", "10000")
    expect(items[0]).toHaveAttribute("aria-posinset", "1")
  })

  it("shifts the window on scroll", () => {
    const { container } = render(
      <VirtualList
        count={1000}
        itemHeight={20}
        height={100}
        overscan={0}
        renderItem={(i) => `Row ${i}`}
      />,
    )
    const viewport = container.firstElementChild as HTMLElement
    viewport.scrollTop = 2000
    fireEvent.scroll(viewport)
    expect(screen.getByText("Row 100")).toBeInTheDocument()
    expect(screen.queryByText("Row 0")).toBeNull()
  })

  it("is a keyboard-reachable scroll region", () => {
    const { container } = render(
      <VirtualList count={3} itemHeight={20} height={100} renderItem={(i) => i} />,
    )
    expect(container.firstElementChild).toHaveAttribute("tabindex", "0")
  })
})
