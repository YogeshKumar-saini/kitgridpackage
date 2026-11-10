import { act, fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./navigation-menu.js"

const Example = () => (
  <NavigationMenu aria-label="Main">
    <NavigationMenuList>
      <NavigationMenuItem value="products">
        <NavigationMenuTrigger>Products</NavigationMenuTrigger>
        <NavigationMenuContent>
          <NavigationMenuLink href="#a" description="Ledger">
            Billing
          </NavigationMenuLink>
          <NavigationMenuLink href="#b" description="Cards">
            Issuing
          </NavigationMenuLink>
        </NavigationMenuContent>
      </NavigationMenuItem>
      <NavigationMenuItem value="docs">
        <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
        <NavigationMenuContent>
          <NavigationMenuLink href="#c" description="Guides">
            Start
          </NavigationMenuLink>
        </NavigationMenuContent>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuLink href="#p" active>
          Pricing
        </NavigationMenuLink>
      </NavigationMenuItem>
    </NavigationMenuList>
  </NavigationMenu>
)

describe("NavigationMenu", () => {
  it("is a navigation landmark with disclosure triggers", () => {
    render(<Example />)
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument()
    const trigger = screen.getByRole("button", { name: "Products" })
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute(
      "aria-current",
      "page",
    )
  })

  it("toggles on click and closes on Escape with focus on the trigger", async () => {
    render(<Example />)
    const trigger = screen.getByRole("button", { name: "Products" })
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("link", { name: /Billing/ })).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(trigger).toHaveFocus()
  })

  it("moves between top-level items with arrows and into a panel with ArrowDown", async () => {
    render(<Example />)
    screen.getByRole("button", { name: "Products" }).focus()
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByRole("button", { name: "Docs" })).toHaveFocus()
    await userEvent.keyboard("{End}")
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveFocus()
    screen.getByRole("button", { name: "Products" }).focus()
    await userEvent.keyboard("{ArrowDown}")
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)))
    expect(screen.getByRole("link", { name: /Billing/ })).toHaveFocus()
  })

  it("opens on hover intent after a delay", () => {
    jest.useFakeTimers()
    render(<Example />)
    const trigger = screen.getByRole("button", { name: "Docs" })
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" })
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    act(() => {
      jest.advanceTimersByTime(300)
    })
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    jest.useRealTimers()
  })
})
