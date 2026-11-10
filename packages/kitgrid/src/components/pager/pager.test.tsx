import { render, screen } from "@testing-library/react"
import { Pager } from "./pager.js"

describe("Pager", () => {
  it("links to the previous and next pages with rel hints", () => {
    render(
      <Pager
        previous={{ label: "Installation", href: "/install" }}
        next={{ label: "Theming", href: "/theming" }}
      />,
    )
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument()
    const prev = screen.getByRole("link", { name: /Previous.*Installation/ })
    expect(prev).toHaveAttribute("rel", "prev")
    expect(screen.getByRole("link", { name: /Next.*Theming/ })).toHaveAttribute("href", "/theming")
  })

  it("renders only the side that exists", () => {
    render(<Pager next={{ label: "Theming", href: "/theming" }} />)
    expect(screen.getAllByRole("link")).toHaveLength(1)
  })
})
