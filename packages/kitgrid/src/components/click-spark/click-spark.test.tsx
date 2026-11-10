import { fireEvent, render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { ClickSpark } from "./click-spark.js"

describe("ClickSpark", () => {
  it("keeps its content interactive and the canvas hidden", () => {
    const onClick = jest.fn()
    const { container } = render(
      <ClickSpark>
        <button type="button" onClick={onClick}>
          Like
        </button>
      </ClickSpark>,
    )
    const button = screen.getByRole("button", { name: "Like" })
    fireEvent.pointerDown(button)
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(container.querySelector("canvas")).toHaveAttribute("aria-hidden", "true")
  })

  it("renders under reduced motion without throwing", () => {
    render(
      <KitgridProvider reducedMotion="always">
        <ClickSpark>
          <span>Quiet</span>
        </ClickSpark>
      </KitgridProvider>,
    )
    expect(screen.getByText("Quiet")).toBeInTheDocument()
  })
})
