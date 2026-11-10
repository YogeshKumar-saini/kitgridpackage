import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ChipList } from "./chip-list.js"

const skills = ["React", "Rust", "Figma", "SQL", "Go"]

describe("ChipList", () => {
  it("renders a list of chips", () => {
    render(<ChipList items={skills} aria-label="Skills" />)
    expect(screen.getByRole("list", { name: "Skills" })).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(5)
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("folds overflow into a +N toggle", async () => {
    const user = userEvent.setup()
    render(<ChipList items={skills} max={2} />)
    const more = screen.getByRole("button", { name: "Show 3 more" })
    expect(more).toHaveTextContent("+3")
    expect(screen.queryByText("Figma")).toBeNull()
    await user.click(more)
    expect(screen.getByText("Figma")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Show fewer" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
  })

  it("applies tones from item objects", () => {
    render(<ChipList items={[{ label: "Paid", tone: "success" }]} />)
    expect(screen.getByText("Paid")).toHaveAttribute("data-tone", "success")
  })
})
