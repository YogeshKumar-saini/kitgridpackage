import { act, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import {
  AppShell,
  AppShellHeader,
  AppShellMain,
  type AppShellProps,
  AppShellSidebar,
  AppShellToggle,
} from "./app-shell.js"

const setViewport = (mobile: boolean) => {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes("max-width") ? mobile : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

const Shell = (props: AppShellProps) => (
  <AppShell {...props}>
    <AppShellSidebar label="Workspace">
      <a href="#overview">Overview</a>
    </AppShellSidebar>
    <AppShellHeader>
      <AppShellToggle />
    </AppShellHeader>
    <AppShellMain>
      <h1>Overview</h1>
    </AppShellMain>
  </AppShell>
)

describe("AppShell", () => {
  afterEach(() => {
    setViewport(false)
    localStorage.clear()
  })

  it("renders sidebar, banner and main landmarks with a skip link to main", async () => {
    setViewport(false)
    render(<Shell />)
    expect(screen.getByRole("complementary", { name: "Workspace" })).toBeInTheDocument()
    expect(screen.getByRole("banner")).toBeInTheDocument()
    const main = screen.getByRole("main")
    const skip = screen.getByRole("link", { name: "Skip to content" })
    expect(skip).toHaveAttribute("href", `#${main.id}`)
    await userEvent.click(skip)
    expect(main).toHaveFocus()
  })

  it("folds the sidebar to a rail with the toggle and reports it", async () => {
    setViewport(false)
    const onCollapsedChange = jest.fn()
    const { container } = render(<Shell onCollapsedChange={onCollapsedChange} />)
    const toggle = screen.getByRole("button", { name: "Collapse sidebar" })
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(toggle).toHaveAttribute(
      "aria-controls",
      screen.getByRole("complementary").id,
    )
    await userEvent.click(toggle)
    expect(onCollapsedChange).toHaveBeenCalledWith(true)
    expect(container.firstElementChild).toHaveAttribute("data-collapsed")
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
  })

  it("remembers the collapsed state under storageKey", () => {
    setViewport(false)
    localStorage.setItem("shell", "true")
    const { container } = render(<Shell storageKey="shell" />)
    expect(container.firstElementChild).toHaveAttribute("data-collapsed")
  })

  it("writes the width props to CSS variables", () => {
    setViewport(false)
    const { container } = render(<Shell sidebarWidth="18rem" railWidth="3.5rem" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.style.getPropertyValue("--kg-app-shell-sidebar")).toBe("18rem")
    expect(root.style.getPropertyValue("--kg-app-shell-rail")).toBe("3.5rem")
  })

  it("moves the sidebar into a modal drawer on mobile", async () => {
    setViewport(true)
    render(<Shell />)
    expect(screen.queryByRole("complementary")).toBeNull()
    const toggle = screen.getByRole("button", { name: "Open navigation" })
    expect(toggle).toHaveAttribute("aria-haspopup", "dialog")
    await userEvent.click(toggle)
    const drawer = screen.getByRole("dialog", { name: "Workspace" })
    expect(drawer).toHaveAttribute("data-side", "left")
    expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument()
    await act(async () => {
      screen.getByRole("button", { name: "Close navigation" }).click()
    })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
  })
})
