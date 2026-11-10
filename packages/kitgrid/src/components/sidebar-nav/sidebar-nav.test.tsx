import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import {
  SidebarNav,
  SidebarNavGroup,
  SidebarNavItem,
  type SidebarNavProps,
  SidebarNavSection,
} from "./sidebar-nav.js"

// jsdom applies the UA rule hiding [popover] but has no showPopover(), so Layer stays hidden.
beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

const Nav = (props: SidebarNavProps) => (
  <SidebarNav label="Main" {...props}>
    <SidebarNavSection title="Read">
      <SidebarNavItem href="/overview" icon={<svg />} active>
        Overview
      </SidebarNavItem>
      <SidebarNavItem href="/inbox" icon={<svg />} badge="12">
        Inbox
      </SidebarNavItem>
      <SidebarNavGroup label="Reports" icon={<svg />}>
        <SidebarNavItem href="/reports/weekly">Weekly</SidebarNavItem>
        <SidebarNavItem href="/reports/monthly">Monthly</SidebarNavItem>
      </SidebarNavGroup>
      <SidebarNavItem disabled>Archive</SidebarNavItem>
    </SidebarNavSection>
  </SidebarNav>
)

describe("SidebarNav", () => {
  it("renders a labelled navigation with sections as labelled lists and the current page", () => {
    render(<Nav />)
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument()
    expect(screen.getByRole("list", { name: "Read" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(screen.getByRole("link", { name: /Inbox/ })).toHaveTextContent("12")
    expect(screen.getByRole("button", { name: "Archive" })).toHaveAttribute(
      "aria-disabled",
      "true",
    )
  })

  it("moves focus with the arrow keys, skipping links inside a closed group", () => {
    render(<Nav />)
    const nav = screen.getByRole("navigation")
    const overview = screen.getByRole("link", { name: "Overview" })
    overview.focus()
    fireEvent.keyDown(nav, { key: "ArrowDown" })
    expect(screen.getByRole("link", { name: /Inbox/ })).toHaveFocus()
    fireEvent.keyDown(nav, { key: "ArrowDown" })
    expect(screen.getByRole("button", { name: "Reports" })).toHaveFocus()
    fireEvent.keyDown(nav, { key: "End" })
    expect(screen.getByRole("button", { name: "Reports" })).toHaveFocus()
    fireEvent.keyDown(nav, { key: "Home" })
    expect(overview).toHaveFocus()
  })

  it("opens a group with a click or Right Arrow and closes it with Left Arrow", async () => {
    render(<Nav />)
    const group = screen.getByRole("button", { name: "Reports" })
    expect(group).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(group)
    expect(group).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("link", { name: "Weekly" })).toBeInTheDocument()

    const nav = screen.getByRole("navigation")
    group.focus()
    fireEvent.keyDown(nav, { key: "ArrowDown" })
    expect(screen.getByRole("link", { name: "Weekly" })).toHaveFocus()

    fireEvent.keyDown(group, { key: "ArrowLeft" })
    expect(group).toHaveAttribute("aria-expanded", "false")
    fireEvent.keyDown(group, { key: "ArrowRight" })
    expect(group).toHaveAttribute("aria-expanded", "true")
  })

  it("keeps labels as accessible names in the collapsed rail and shows them as tooltips", async () => {
    render(<Nav collapsed />)
    expect(screen.getByRole("navigation")).toHaveAttribute("data-collapsed")
    const overview = screen.getByRole("link", { name: "Overview" })
    overview.focus()
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Overview")
  })

  it("renders a router link through asChild with the item's icon and label", () => {
    const Link = ({ to, ...props }: { to: string; children?: React.ReactNode }) => (
      <a href={to} {...props} />
    )
    render(
      <SidebarNav>
        <SidebarNavSection>
          <SidebarNavItem asChild icon={<svg data-testid="icon" />} active>
            <Link to="/settings">Settings</Link>
          </SidebarNavItem>
        </SidebarNavSection>
      </SidebarNav>,
    )
    const link = screen.getByRole("link", { name: "Settings" })
    expect(link).toHaveAttribute("href", "/settings")
    expect(link).toHaveAttribute("aria-current", "page")
    expect(link).toContainElement(screen.getByTestId("icon"))
  })
})
