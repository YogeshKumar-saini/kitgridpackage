import { render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { AnimatedList } from "./animated-list.js"

describe("AnimatedList", () => {
  it("waits for the list to scroll into view", () => {
    render(
      <AnimatedList>
        <span>Order placed</span>
        <span>Payment received</span>
      </AnimatedList>,
    )
    expect(screen.getByRole("list")).toBeInTheDocument()
    expect(screen.queryAllByRole("listitem")).toHaveLength(0)
  })

  it("shows every item, newest first, under reduced motion", () => {
    render(
      <KitgridProvider reducedMotion="always">
        <AnimatedList>
          <span>First</span>
          <span>Second</span>
          <span>Third</span>
        </AnimatedList>
      </KitgridProvider>,
    )
    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent("Third")
  })

  it("keeps arrival order when asked", () => {
    render(
      <KitgridProvider reducedMotion="always">
        <AnimatedList order="oldest-first">
          <span>First</span>
          <span>Second</span>
        </AnimatedList>
      </KitgridProvider>,
    )
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("First")
  })
})
