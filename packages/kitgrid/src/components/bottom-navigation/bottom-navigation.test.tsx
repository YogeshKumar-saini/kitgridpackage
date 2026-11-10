import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { BottomNavigation } from "./bottom-navigation.js"

const items = [
  { value: "home", label: "Home", icon: <svg /> },
  { value: "inbox", label: "Inbox", icon: <svg />, badge: 3 },
  { value: "me", label: "Profile", icon: <svg />, href: "#me" },
]

describe("BottomNavigation", () => {
  it("is a labelled navigation with the first item current", () => {
    render(<BottomNavigation items={items} />)
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(screen.getByRole("button", { name: /Inbox.*3/ })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "#me")
  })

  it("moves the current item on click and reports it", async () => {
    const onValueChange = jest.fn()
    render(<BottomNavigation items={items} onValueChange={onValueChange} />)
    const inbox = screen.getByRole("button", { name: /Inbox/ })
    await userEvent.click(inbox)
    expect(inbox).toHaveAttribute("aria-current", "page")
    expect(onValueChange).toHaveBeenCalledWith("inbox")
  })

  it("renders href items through renderLink", async () => {
    render(
      <BottomNavigation
        items={items}
        renderLink={({ href, ...props }) => <a data-router="" href={href} {...props} />}
      />,
    )
    const link = screen.getByRole("link", { name: "Profile" })
    expect(link).toHaveAttribute("data-router")
    await userEvent.click(link)
    expect(link).toHaveAttribute("aria-current", "page")
  })
})
