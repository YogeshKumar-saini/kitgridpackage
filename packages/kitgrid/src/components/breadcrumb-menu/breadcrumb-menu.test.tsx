import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { BreadcrumbMenu } from "./breadcrumb-menu.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

const items = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/p" },
  { label: "Atlas", href: "/p/atlas" },
  { label: "Docs", href: "/p/atlas/docs" },
  { label: "API", href: "/p/atlas/docs/api" },
  { label: "Webhooks" },
]

describe("BreadcrumbMenu", () => {
  it("shows every crumb when short, last one current", () => {
    render(<BreadcrumbMenu items={items.slice(0, 3)} />)
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Projects" })).toBeInTheDocument()
    expect(screen.getByText("Atlas")).toHaveAttribute("aria-current", "page")
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("folds middle crumbs into a menu", async () => {
    const onNavigate = jest.fn()
    render(<BreadcrumbMenu items={items} maxItems={4} onNavigate={onNavigate} />)
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Atlas" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "API" })).toBeInTheDocument()
    expect(screen.getByText("Webhooks")).toHaveAttribute("aria-current", "page")
    await userEvent.click(screen.getByRole("button", { name: "Show hidden pages" }))
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Projects",
      "Atlas",
      "Docs",
    ])
    await userEvent.click(screen.getByRole("menuitem", { name: "Atlas" }))
    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({ label: "Atlas" }))
  })

  it("renders crumbs through renderLink", () => {
    render(
      <BreadcrumbMenu
        items={items.slice(0, 3)}
        renderLink={({ href, ...props }) => <a data-router="" href={href} {...props} />}
      />,
    )
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("data-router")
  })

  it("renders a crumb without href as text, not a link", () => {
    render(<BreadcrumbMenu items={[{ label: "Home", href: "/" }, { label: "Archive" }, { label: "2024" }]} />)
    expect(screen.queryByRole("link", { name: "Archive" })).not.toBeInTheDocument()
    expect(screen.getByText("Archive")).toBeInTheDocument()
  })
})
