import { act, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import {
  ModalStack,
  ModalStackContent,
  ModalStackTitle,
  ModalStackTrigger,
} from "./modal-stack.js"

const Example = () => (
  <ModalStack>
    <ModalStackTrigger>Edit team</ModalStackTrigger>
    <ModalStackContent>
      <ModalStackTitle>Team</ModalStackTitle>
      <ModalStack>
        <ModalStackTrigger>Add member</ModalStackTrigger>
        <ModalStackContent>
          <ModalStackTitle>New member</ModalStackTitle>
          <input aria-label="Email" />
        </ModalStackContent>
      </ModalStack>
    </ModalStackContent>
  </ModalStack>
)

describe("ModalStack", () => {
  it("opens a child dialog over the parent, which recedes", async () => {
    render(<Example />)
    await userEvent.click(screen.getByRole("button", { name: "Edit team" }))
    const parent = screen.getByRole("dialog", { name: "Team" })
    expect(parent).toHaveAttribute("data-depth", "0")
    expect(parent).not.toHaveAttribute("data-behind")
    await userEvent.click(screen.getByRole("button", { name: "Add member" }))
    const child = screen.getByRole("dialog", { name: "New member" })
    expect(child).toHaveAttribute("data-depth", "1")
    expect(parent).toHaveAttribute("data-behind")
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveFocus()
  })

  it("peels one layer per Escape, returning focus to the child's trigger", async () => {
    render(<Example />)
    await userEvent.click(screen.getByRole("button", { name: "Edit team" }))
    await userEvent.click(screen.getByRole("button", { name: "Add member" }))
    const child = screen.getByRole("dialog", { name: "New member" })
    act(() => {
      child.dispatchEvent(new Event("cancel", { cancelable: true }))
    })
    expect(screen.queryByRole("dialog", { name: "New member" })).not.toBeInTheDocument()
    const parent = screen.getByRole("dialog", { name: "Team" })
    expect(parent).not.toHaveAttribute("data-behind")
    expect(screen.getByRole("button", { name: "Add member" })).toHaveFocus()
  })
})
