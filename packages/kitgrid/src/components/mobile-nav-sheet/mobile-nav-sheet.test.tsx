import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { MobileNavSheet } from "./mobile-nav-sheet.js"

const items = [
  { label: "Home", href: "#home", active: true },
  {
    label: "Shop",
    items: [
      { label: "Women", href: "#women" },
      { label: "Men", href: "#men" },
    ],
  },
]

describe("MobileNavSheet", () => {
  it("opens a titled sheet from the hamburger", async () => {
    render(<MobileNavSheet items={items} />)
    const trigger = screen.getByRole("button", { name: "Open menu" })
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog")
    await userEvent.click(trigger)
    expect(screen.getByRole("dialog", { name: "Menu" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page")
  })

  it("drills into a level and back, restoring focus to the opener", async () => {
    render(<MobileNavSheet items={items} />)
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }))
    await userEvent.click(screen.getByRole("button", { name: "Shop" }))
    expect(screen.getByRole("dialog", { name: "Shop" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Women" })).toHaveFocus()
    await userEvent.click(screen.getByRole("button", { name: "Back" }))
    expect(screen.getByRole("button", { name: "Shop" })).toHaveFocus()
  })

  it("closes after choosing a link", async () => {
    const onNavigate = jest.fn()
    render(<MobileNavSheet items={items} onNavigate={onNavigate} />)
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }))
    await userEvent.click(screen.getByRole("link", { name: "Home" }))
    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({ label: "Home" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
