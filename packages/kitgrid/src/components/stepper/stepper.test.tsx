import { render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Stepper } from "./stepper.js"

const steps = [{ label: "Account" }, { label: "Workspace" }, { label: "Invite" }]

describe("Stepper", () => {
  it("is a labelled ordered list marking the current step", () => {
    render(<Stepper steps={steps} current={1} />)
    const list = screen.getByRole("list", { name: "Progress" })
    const items = within(list).getAllByRole("listitem")
    expect(items).toHaveLength(3)
    expect(items[1]).toHaveAttribute("aria-current", "step")
    expect(items[0]).toHaveTextContent("Account, Completed")
    expect(items[2]).toHaveTextContent("Invite, Not started")
  })

  it("lets completed steps jump back when clickable", async () => {
    const onStepClick = jest.fn()
    render(<Stepper steps={steps} current={2} onStepClick={onStepClick} />)
    await userEvent.click(screen.getByRole("button", { name: /Workspace/ }))
    expect(onStepClick).toHaveBeenCalledWith(1)
    expect(screen.queryByRole("button", { name: /Invite/ })).not.toBeInTheDocument()
  })

  it("honours an explicit error status", () => {
    render(<Stepper steps={[{ label: "Pay", status: "error" }, { label: "Done" }]} current={0} />)
    expect(screen.getAllByRole("listitem")[0]).toHaveAttribute("data-status", "error")
  })
})
