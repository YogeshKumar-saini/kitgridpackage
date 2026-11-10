import { fireEvent, render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { FallingText } from "./falling-text.js"

describe("FallingText", () => {
  it("keeps the sentence readable and hides the word pile", () => {
    const { container } = render(<FallingText>Gravity always wins</FallingText>)
    expect(screen.getByRole("button", { name: "Gravity always wins" })).toBeInTheDocument()
    expect(container.querySelector(".kg-falling-text__text")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("toggles by mouse or keyboard", () => {
    render(<FallingText>Drop it</FallingText>)
    const button = screen.getByRole("button")
    expect(button).toHaveAttribute("aria-pressed", "false")
    fireEvent.click(button)
    expect(button).toHaveAttribute("aria-pressed", "true")
    expect(button).toHaveAttribute("data-state", "fallen")
    fireEvent.keyDown(button, { key: "Enter" })
    expect(button).toHaveAttribute("aria-pressed", "false")
  })

  it("is not a control when triggered by view", () => {
    render(<FallingText trigger="view">Scroll</FallingText>)
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("marks highlighted words", () => {
    const { container } = render(<FallingText highlight={["wins"]}>Gravity wins</FallingText>)
    expect(container.querySelector("[data-highlight]")).toHaveTextContent("wins")
  })

  it("never falls under reduced motion", () => {
    render(
      <KitgridProvider reducedMotion="always">
        <FallingText>Stay put</FallingText>
      </KitgridProvider>,
    )
    const button = screen.getByRole("button")
    fireEvent.click(button)
    expect(button).toHaveAttribute("data-state", "standing")
  })
})
