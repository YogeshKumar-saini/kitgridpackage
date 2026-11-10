import { render, screen } from "@testing-library/react"
import { Hide, Show } from "./show.js"

describe("Show and Hide", () => {
  it("describe their range in data attributes for the stylesheet", () => {
    render(
      <>
        <Show data-testid="show" above="md">
          Wide
        </Show>
        <Hide data-testid="hide" below="sm" scope="container">
          Narrow
        </Hide>
      </>,
    )
    const show = screen.getByTestId("show")
    expect(show).toHaveAttribute("data-kind", "show")
    expect(show).toHaveAttribute("data-above", "md")
    expect(show).toHaveAttribute("data-scope", "viewport")
    const hide = screen.getByTestId("hide")
    expect(hide).toHaveAttribute("data-kind", "hide")
    expect(hide).toHaveAttribute("data-below", "sm")
    expect(hide).toHaveAttribute("data-scope", "container")
    expect(screen.getByText("Wide")).toBeInTheDocument()
  })
})
