import { render, screen } from "@testing-library/react"
import { Breadcrumb } from "../breadcrumb/breadcrumb.js"
import { Topbar } from "./topbar.js"

describe("Topbar", () => {
  it("lays out the slots it is given and nothing else", () => {
    const { container } = render(
      <Topbar
        leading={<button type="button">Menu</button>}
        breadcrumb={<span>Reports</span>}
        actions={<button type="button">Share</button>}
      />,
    )
    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument()
    expect(screen.getByText("Reports")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument()
    expect(container.querySelector(".kg-topbar__search")).toBeNull()
  })

  it("marks the elevated variant for styling", () => {
    const { container } = render(
      <Topbar elevated search={<input aria-label="Search" />} />,
    )
    expect(container.firstElementChild).toHaveAttribute("data-elevated")
    expect(screen.getByRole("textbox", { name: "Search" })).toBeInTheDocument()
  })

  it("keeps a Breadcrumb on one line unless it asks to wrap", () => {
    const items = [{ label: "Reports", href: "#" }, { label: "Weekly" }]
    const { container, rerender } = render(<Topbar breadcrumb={<Breadcrumb items={items} />} />)
    expect(container.querySelector(".kg-breadcrumb__list")).toHaveClass("flex-nowrap")
    rerender(<Topbar breadcrumb={<Breadcrumb items={items} wrap />} />)
    expect(container.querySelector(".kg-breadcrumb__list")).toHaveClass("flex-wrap")
  })
})
