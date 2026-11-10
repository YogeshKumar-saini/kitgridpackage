import { fireEvent, render, screen } from "@testing-library/react"
import { FlowingMenu } from "./flowing-menu.js"

const items = [
  { label: "Studio", href: "#studio" },
  { label: "Journal", href: "#journal" },
]

describe("FlowingMenu", () => {
  it("is a labelled navigation of links with hidden marquees", () => {
    const { container } = render(<FlowingMenu items={items} label="Primary" />)
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument()
    expect(screen.getAllByRole("link")).toHaveLength(2)
    expect(screen.getByRole("link", { name: "Studio" })).toHaveAttribute("href", "#studio")
    for (const band of container.querySelectorAll(".kg-flowing-menu__band")) {
      expect(band).toHaveAttribute("aria-hidden", "true")
    }
  })

  it("opens a row on hover and closes it on leave", () => {
    const { container } = render(<FlowingMenu items={items} />)
    const row = container.querySelector(".kg-flowing-menu__row") as HTMLElement
    fireEvent.pointerEnter(row, { clientY: 0 })
    expect(row).toHaveAttribute("data-state", "open")
    fireEvent.pointerLeave(row, { clientY: 0 })
    expect(row).toHaveAttribute("data-state", "closed")
  })
})
