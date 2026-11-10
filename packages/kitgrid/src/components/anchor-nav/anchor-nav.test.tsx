import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { AnchorNav } from "./anchor-nav.js"

const items = [
  { id: "overview", label: "Overview" },
  { id: "specs", label: "Specs" },
  { id: "reviews", label: "Reviews" },
]

beforeEach(() => {
  window.scrollTo = jest.fn() as unknown as typeof window.scrollTo
  Object.defineProperty(document.documentElement, "scrollHeight", {
    configurable: true,
    value: 10_000,
  })
})

describe("AnchorNav", () => {
  it("renders labelled in-page links", () => {
    render(<AnchorNav items={items} />)
    expect(screen.getByRole("navigation", { name: "Sections" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Specs" })).toHaveAttribute("href", "#specs")
  })

  it("marks the clicked section current and scrolls to it", async () => {
    const onActiveChange = jest.fn()
    render(
      <>
        <AnchorNav items={items} onActiveChange={onActiveChange} />
        {items.map((item) => (
          <section key={item.id} id={item.id} />
        ))}
      </>,
    )
    const reviews = screen.getByRole("link", { name: "Reviews" })
    await userEvent.click(reviews)
    expect(reviews).toHaveAttribute("aria-current", "location")
    expect(window.scrollTo).toHaveBeenCalled()
    expect(onActiveChange).toHaveBeenLastCalledWith("reviews")
  })
})
