import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "./popover.js"

const Example = ({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) => (
  <>
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger>Filters</PopoverTrigger>
      <PopoverContent aria-label="Filters">
        <label>
          Min price
          <input />
        </label>
        <PopoverClose>Apply</PopoverClose>
      </PopoverContent>
    </Popover>
    <button type="button">Elsewhere</button>
  </>
)

// jsdom applies the UA rule hiding [popover] but has no showPopover(), so Layer stays hidden.
beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

describe("Popover", () => {
  it("exposes its state on the trigger and moves focus inside on open", async () => {
    render(<Example />)
    const trigger = screen.getByRole("button", { name: "Filters" })
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog")
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(trigger).not.toHaveAttribute("aria-controls")

    await userEvent.click(trigger)
    const popover = screen.getByRole("dialog", { name: "Filters" })
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(trigger).toHaveAttribute("aria-controls", popover.id)
    expect(screen.getByRole("textbox", { name: "Min price" })).toHaveFocus()
  })

  it("closes on Escape and returns focus to the trigger", async () => {
    const onOpenChange = jest.fn()
    render(<Example onOpenChange={onOpenChange} />)
    const trigger = screen.getByRole("button", { name: "Filters" })
    await userEvent.click(trigger)
    await userEvent.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    expect(trigger).toHaveFocus()
  })

  it("closes on an outside press without stealing focus back", async () => {
    render(<Example />)
    await userEvent.click(screen.getByRole("button", { name: "Filters" }))
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" })
    await userEvent.click(elsewhere)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(elsewhere).toHaveFocus()
  })

  it("closes when focus tabs out, and from PopoverClose", async () => {
    render(<Example />)
    const trigger = screen.getByRole("button", { name: "Filters" })
    await userEvent.click(trigger)
    await userEvent.tab()
    await userEvent.tab()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Elsewhere" })).toHaveFocus()

    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it("can be controlled", async () => {
    const Controlled = () => {
      const [open, setOpen] = useState(true)
      return (
        <>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger>Share</PopoverTrigger>
            <PopoverContent aria-label="Share">Link copied</PopoverContent>
          </Popover>
          <span>{open ? "open" : "closed"}</span>
        </>
      )
    }
    render(<Controlled />)
    expect(screen.getByRole("dialog", { name: "Share" })).toHaveTextContent(
      "Link copied",
    )
    fireEvent.pointerDown(document.body)
    expect(screen.getByText("closed")).toBeInTheDocument()
  })
})
