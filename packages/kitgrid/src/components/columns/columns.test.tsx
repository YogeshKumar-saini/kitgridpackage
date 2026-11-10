import { render, screen } from "@testing-library/react"
import { Columns } from "./columns.js"

describe("Columns", () => {
  it("records which side holds the side column and its width", () => {
    render(
      <Columns data-testid="c" side="end" sideWidth="20rem" contentMin="60%">
        <main>Main</main>
        <aside>Side</aside>
      </Columns>,
    )
    const columns = screen.getByTestId("c")
    expect(columns).toHaveAttribute("data-side", "end")
    expect(columns.style.getPropertyValue("--_side")).toBe("20rem")
    expect(columns.style.getPropertyValue("--_content-min")).toBe("60%")
    expect(screen.getByRole("complementary")).toHaveTextContent("Side")
  })
})
