import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { DotPagination } from "./dot-pagination.js"

describe("DotPagination", () => {
  it("labels each dot and marks the current one", () => {
    render(<DotPagination count={4} defaultValue={1} />)
    expect(screen.getByRole("group", { name: "Pages" })).toBeInTheDocument()
    const current = screen.getByRole("button", { name: "Page 2 of 4" })
    expect(current).toHaveAttribute("aria-current", "true")
    expect(current).toHaveAttribute("tabindex", "0")
    expect(screen.getByRole("button", { name: "Page 1 of 4" })).toHaveAttribute("tabindex", "-1")
  })

  it("selects with click and arrow keys", async () => {
    const onValueChange = jest.fn()
    render(<DotPagination count={3} onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole("button", { name: "Page 3 of 3" }))
    expect(onValueChange).toHaveBeenLastCalledWith(2)
    await userEvent.keyboard("{ArrowLeft}")
    expect(onValueChange).toHaveBeenLastCalledWith(1)
    expect(screen.getByRole("button", { name: "Page 2 of 3" })).toHaveFocus()
    await userEvent.keyboard("{Home}")
    expect(onValueChange).toHaveBeenLastCalledWith(0)
  })
})
