import { render, screen } from "@testing-library/react"
import { SettingsNav, SettingsNavItem } from "./settings-nav.js"

describe("SettingsNav", () => {
  it("lists sections as links and marks the current one", () => {
    render(
      <SettingsNav>
        <SettingsNavItem href="/settings" active description="Theme and density">
          Appearance
        </SettingsNavItem>
        <SettingsNavItem href="/settings/shortcuts">Shortcuts</SettingsNavItem>
      </SettingsNav>,
    )
    expect(screen.getByRole("navigation", { name: "Settings" })).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
    expect(screen.getByRole("link", { name: /Appearance/ })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(screen.getByRole("link", { name: "Shortcuts" })).not.toHaveAttribute(
      "aria-current",
    )
  })

  it("renders buttons without href and router links through asChild", () => {
    const onClick = jest.fn()
    render(
      <SettingsNav label="Account">
        <SettingsNavItem onClick={onClick}>Profile</SettingsNavItem>
        <SettingsNavItem asChild active>
          <a href="/billing">Billing</a>
        </SettingsNavItem>
      </SettingsNav>,
    )
    screen.getByRole("button", { name: "Profile" }).click()
    expect(onClick).toHaveBeenCalled()
    expect(screen.getByRole("link", { name: "Billing" })).toHaveAttribute(
      "aria-current",
      "page",
    )
  })
})
