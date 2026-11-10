import { render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Pagination, paginationRange } from "./pagination.js"

describe("paginationRange", () => {
  it("keeps a constant number of slots with ellipses on the long side", () => {
    expect(paginationRange(1, 10)).toEqual([1, 2, 3, 4, 5, "ellipsis-end", 10])
    expect(paginationRange(5, 10)).toEqual([
      1,
      "ellipsis-start",
      4,
      5,
      6,
      "ellipsis-end",
      10,
    ])
    expect(paginationRange(10, 10)).toEqual([1, "ellipsis-start", 6, 7, 8, 9, 10])
  })

  it("lists every page when they fit and honours boundaries and siblings", () => {
    expect(paginationRange(2, 3)).toEqual([1, 2, 3])
    expect(paginationRange(1, 1)).toEqual([1])
    expect(paginationRange(10, 20, 2, 2)).toEqual([
      1,
      2,
      "ellipsis-start",
      8,
      9,
      10,
      11,
      12,
      "ellipsis-end",
      19,
      20,
    ])
  })
})

describe("Pagination", () => {
  it("renders a labelled nav with the current page marked", () => {
    render(<Pagination page={5} pageCount={10} onPageChange={() => {}} />)
    const nav = screen.getByRole("navigation", { name: "Pagination" })
    expect(within(nav).getByRole("button", { name: "Page 5" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(nav.querySelectorAll(".kg-pagination__ellipsis")).toHaveLength(2)
    expect(nav.querySelector(".kg-pagination__ellipsis")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("requests pages through onPageChange and disables the ends", async () => {
    const onPageChange = jest.fn()
    render(<Pagination page={1} pageCount={4} onPageChange={onPageChange} />)
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(onPageChange).toHaveBeenLastCalledWith(2)
    await userEvent.click(screen.getByRole("button", { name: "Page 4" }))
    expect(onPageChange).toHaveBeenLastCalledWith(4)
  })

  it("renders crawlable links in link mode with disabled ends exposed", () => {
    render(
      <Pagination page={3} pageCount={3} getHref={(page) => `/shop?page=${page}`} />,
    )
    expect(screen.getByRole("link", { name: "Page 2" })).toHaveAttribute(
      "href",
      "/shop?page=2",
    )
    expect(screen.getByRole("link", { name: "Page 3" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    const next = screen.getByRole("link", { name: "Next" })
    expect(next).toHaveAttribute("aria-disabled", "true")
    expect(next).not.toHaveAttribute("href")
  })

  it("uses custom labels", () => {
    render(
      <Pagination
        page={1}
        pageCount={2}
        onPageChange={() => {}}
        labels={{
          nav: "Results pages",
          previous: "Back",
          next: "Forward",
          page: (n) => `Go to ${n}`,
        }}
      />,
    )
    expect(
      screen.getByRole("navigation", { name: "Results pages" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Forward" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Go to 2" })).toBeInTheDocument()
  })
})
