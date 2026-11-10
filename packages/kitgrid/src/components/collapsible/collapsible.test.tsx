import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible.js"

describe("Collapsible", () => {
  it("wires the trigger to the region and toggles it", async () => {
    const onOpenChange = jest.fn()
    render(
      <Collapsible onOpenChange={onOpenChange}>
        <CollapsibleTrigger>3 more files</CollapsibleTrigger>
        <CollapsibleContent>
          <a href="#a">notes.md</a>
        </CollapsibleContent>
      </Collapsible>,
    )
    const trigger = screen.getByRole("button", { name: "3 more files" })
    const region = document.getElementById(trigger.getAttribute("aria-controls")!)!
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(region).toHaveAttribute("inert")
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(region).not.toHaveAttribute("inert")
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it("supports Enter and Space through the native button", async () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Details</CollapsibleTrigger>
        <CollapsibleContent>Body</CollapsibleContent>
      </Collapsible>,
    )
    const trigger = screen.getByRole("button", { name: "Details" })
    trigger.focus()
    await userEvent.keyboard("{Enter}")
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    await userEvent.keyboard(" ")
    expect(trigger).toHaveAttribute("aria-expanded", "false")
  })

  it("disables the trigger", () => {
    render(
      <Collapsible disabled>
        <CollapsibleTrigger>Locked</CollapsibleTrigger>
        <CollapsibleContent>Body</CollapsibleContent>
      </Collapsible>,
    )
    expect(screen.getByRole("button", { name: "Locked" })).toBeDisabled()
  })
})
