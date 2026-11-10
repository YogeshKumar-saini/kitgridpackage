import { render, screen } from "@testing-library/react"
import { Grid } from "./grid.js"

describe("Grid", () => {
  it("passes per-width column counts to the stylesheet", () => {
    render(
      <Grid data-testid="grid" columns={{ base: 1, md: 3 }} gap={2}>
        <div>A</div>
      </Grid>,
    )
    const grid = screen.getByTestId("grid")
    expect(grid).toHaveAttribute("data-mode", "columns")
    expect(grid.style.getPropertyValue("--_c-base")).toBe("1")
    expect(grid.style.getPropertyValue("--_c-md")).toBe("3")
    expect(grid.style.getPropertyValue("--_c-sm")).toBe("")
    expect(screen.getByText("A").parentElement).toHaveClass("kg-grid__track")
  })

  it("switches to intrinsic columns with a minimum width", () => {
    render(<Grid data-testid="grid" minItemWidth="12rem" fit />)
    const grid = screen.getByTestId("grid")
    expect(grid).toHaveAttribute("data-mode", "fit")
    expect(grid.style.getPropertyValue("--_min")).toBe("12rem")
  })

  it("renders the track as a list when asked", () => {
    render(
      <Grid as="ul" columns={2}>
        <li>One</li>
      </Grid>,
    )
    expect(screen.getByRole("list")).toHaveClass("kg-grid__track")
  })
})
