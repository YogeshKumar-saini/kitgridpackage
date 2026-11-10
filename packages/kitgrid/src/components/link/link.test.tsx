import { render, screen } from "@testing-library/react"
import { Link } from "./link.js"

describe("Link", () => {
  it("renders an anchor with tone and underline", () => {
    render(
      <Link href="/docs" tone="muted" underline="hover">
        Docs
      </Link>,
    )
    const link = screen.getByRole("link", { name: "Docs" })
    expect(link).toHaveAttribute("href", "/docs")
    expect(link).toHaveAttribute("data-tone", "muted")
    expect(link).toHaveAttribute("data-underline", "hover")
    expect(link).not.toHaveAttribute("target")
  })

  it("opens external links safely and says so", () => {
    render(
      <Link href="https://example.com" external>
        Example
      </Link>,
    )
    const link = screen.getByRole("link", { name: /Example\s*\(opens in a new tab\)/ })
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("styles a router link through asChild", () => {
    render(
      <Link asChild>
        <a href="/home">Home</a>
      </Link>,
    )
    expect(screen.getByRole("link", { name: "Home" })).toHaveClass("kg-link")
  })
})
