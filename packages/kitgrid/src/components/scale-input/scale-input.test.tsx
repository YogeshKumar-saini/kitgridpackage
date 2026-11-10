import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ScaleInput } from "./scale-input.js"

describe("ScaleInput", () => {
  it("renders a named radio group from min to max", () => {
    render(<ScaleInput label="How likely are you to recommend us?" />)
    const group = screen.getByRole("radiogroup", { name: "How likely are you to recommend us?" })
    expect(group).toBeInTheDocument()
    expect(screen.getAllByRole("radio")).toHaveLength(11)
  })

  it("describes the ends with their captions", () => {
    render(<ScaleInput label="Ease" min={1} max={5} minLabel="Hard" maxLabel="Easy" />)
    expect(screen.getByRole("radiogroup")).toHaveAccessibleDescription("1: Hard 5: Easy")
  })

  it("picks with a click and moves with the arrow keys", async () => {
    const onValueChange = jest.fn()
    render(<ScaleInput label="Ease" min={1} max={5} onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole("radio", { name: "3" }))
    expect(onValueChange).toHaveBeenLastCalledWith(3)
    await userEvent.keyboard("{ArrowRight}")
    expect(onValueChange).toHaveBeenLastCalledWith(4)
    expect(screen.getByRole("radio", { name: "4" })).toBeChecked()
  })

  it("bands NPS scores", () => {
    render(<ScaleInput label="NPS" tone="nps" />)
    expect(screen.getByRole("radio", { name: "0" }).closest("label")).toHaveAttribute("data-band", "low")
    expect(screen.getByRole("radio", { name: "8" }).closest("label")).toHaveAttribute("data-band", "mid")
    expect(screen.getByRole("radio", { name: "10" }).closest("label")).toHaveAttribute("data-band", "high")
  })
})
