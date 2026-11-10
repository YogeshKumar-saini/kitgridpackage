import { render, screen } from "@testing-library/react"
import { LiveCursorBadge } from "./live-cursor-badge.js"

describe("LiveCursorBadge", () => {
  it("is a named image and positions itself when given coordinates", () => {
    const { rerender } = render(<LiveCursorBadge name="Priya Raman" status="typing" x={120} y={48} />)
    const cursor = screen.getByRole("img", { name: "Priya Raman, typing" })
    expect(cursor).toHaveAttribute("data-positioned")
    expect(cursor.style.getPropertyValue("--_x")).toBe("120px")
    rerender(<LiveCursorBadge name="Mateo Alvarez" compact />)
    expect(screen.getByRole("img", { name: "Mateo Alvarez" })).not.toHaveAttribute("data-positioned")
    expect(screen.queryByText("Mateo Alvarez")).toBeNull()
  })
})
