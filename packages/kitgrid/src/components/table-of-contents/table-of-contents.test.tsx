import { act, fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { TableOfContents } from "./table-of-contents.js"

const items = [
  { id: "intro", label: "Introduction" },
  { id: "setup", label: "Setup" },
  { id: "theming", label: "Theming", level: 2 },
]

const place = (id: string, top: number) => {
  const element = document.getElementById(id)!
  element.getBoundingClientRect = () => ({ top }) as DOMRect
}

beforeEach(() => {
  window.scrollTo = jest.fn() as unknown as typeof window.scrollTo
  Object.defineProperty(document.documentElement, "scrollHeight", {
    configurable: true,
    value: 10_000,
  })
})

const Page = () => (
  <>
    <TableOfContents items={items} offset={40} />
    {items.map((item) => (
      <section key={item.id} id={item.id}>
        {item.label}
      </section>
    ))}
  </>
)

describe("TableOfContents", () => {
  it("renders a labelled navigation with the first section current", async () => {
    render(<Page />)
    place("intro", 0)
    place("setup", 500)
    place("theming", 900)
    await act(async () => {
      fireEvent.scroll(window)
      await new Promise((resolve) => requestAnimationFrame(resolve))
    })
    expect(screen.getByRole("navigation", { name: "On this page" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Introduction" })).toHaveAttribute(
      "aria-current",
      "location",
    )
  })

  it("follows the scroll position", async () => {
    render(<Page />)
    place("intro", -900)
    place("setup", 20)
    place("theming", 700)
    await act(async () => {
      fireEvent.scroll(window)
      await new Promise((resolve) => requestAnimationFrame(resolve))
    })
    expect(screen.getByRole("link", { name: "Setup" })).toHaveAttribute(
      "aria-current",
      "location",
    )
  })

  it("scrolls to a section on click and moves focus to it", async () => {
    render(<Page />)
    await userEvent.click(screen.getByRole("link", { name: "Theming" }))
    expect(window.scrollTo).toHaveBeenCalled()
    expect(document.getElementById("theming")).toHaveFocus()
    expect(screen.getByRole("link", { name: "Theming" })).toHaveAttribute(
      "aria-current",
      "location",
    )
  })
})
