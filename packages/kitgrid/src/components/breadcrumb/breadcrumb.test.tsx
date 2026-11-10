import { render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Breadcrumb, type BreadcrumbItem } from "./breadcrumb.js"

const trail: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Women", href: "/women" },
  { label: "Clothing", href: "/women/clothing" },
  { label: "Dresses", href: "/women/clothing/dresses" },
  { label: "Linen midi dress" },
]

describe("Breadcrumb", () => {
  it("renders a labelled navigation landmark with an ordered list", () => {
    render(<Breadcrumb items={trail} />)
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" })
    const list = within(nav).getByRole("list")
    expect(within(list).getAllByRole("listitem")).toHaveLength(5)
    expect(within(nav).getAllByRole("link")).toHaveLength(4)
    expect(screen.getByText("Linen midi dress")).toHaveAttribute("aria-current", "page")
  })

  it("marks a linked last item as the current page and hides separators", () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Sale", href: "/sale" },
        ]}
      />,
    )
    expect(screen.getByRole("link", { name: "Sale" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    )
    const separator = container.querySelector(".kg-breadcrumb__separator")
    expect(separator).toHaveAttribute("aria-hidden", "true")
  })

  it("collapses the middle and expands it, moving focus to the first revealed link", async () => {
    render(<Breadcrumb items={trail} maxItems={3} />)
    expect(screen.queryByRole("link", { name: "Women" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Dresses" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Show all breadcrumbs" }))
    expect(screen.getByRole("link", { name: "Women" })).toHaveFocus()
    expect(screen.getByRole("link", { name: "Clothing" })).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("renders links through renderLink for router integration", () => {
    render(
      <Breadcrumb
        items={trail.slice(0, 2)}
        renderLink={({ href, ...props }) => (
          <a data-router="" href={`#${href}`} {...props} />
        )}
      />,
    )
    expect(screen.getByRole("link", { name: "Women" })).toHaveAttribute(
      "href",
      "#/women",
    )
    expect(screen.getByRole("link", { name: "Women" })).toHaveAttribute(
      "aria-current",
      "page",
    )
  })
})
