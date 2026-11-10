import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import {
  NestedDrawer,
  NestedDrawerClose,
  NestedDrawerContent,
  NestedDrawerTitle,
  NestedDrawerTrigger,
} from "./nested-drawer.js"

const Example = () => (
  <NestedDrawer>
    <NestedDrawerTrigger>Cart</NestedDrawerTrigger>
    <NestedDrawerContent>
      <NestedDrawerTitle>Cart</NestedDrawerTitle>
      <NestedDrawer>
        <NestedDrawerTrigger>Change address</NestedDrawerTrigger>
        <NestedDrawerContent>
          <NestedDrawerTitle>Address</NestedDrawerTitle>
          <NestedDrawerClose>Done</NestedDrawerClose>
        </NestedDrawerContent>
      </NestedDrawer>
    </NestedDrawerContent>
  </NestedDrawer>
)

describe("NestedDrawer", () => {
  it("pushes a child drawer and sends the parent back", async () => {
    render(<Example />)
    await userEvent.click(screen.getByRole("button", { name: "Cart" }))
    const parent = screen.getByRole("dialog", { name: "Cart" })
    await userEvent.click(screen.getByRole("button", { name: "Change address" }))
    expect(screen.getByRole("dialog", { name: "Address" })).toHaveAttribute("data-depth", "1")
    expect(parent).toHaveAttribute("data-behind")
  })

  it("closing the child restores the parent", async () => {
    render(<Example />)
    await userEvent.click(screen.getByRole("button", { name: "Cart" }))
    await userEvent.click(screen.getByRole("button", { name: "Change address" }))
    await userEvent.click(screen.getByRole("button", { name: "Done" }))
    expect(screen.queryByRole("dialog", { name: "Address" })).not.toBeInTheDocument()
    expect(screen.getByRole("dialog", { name: "Cart" })).not.toHaveAttribute("data-behind")
    expect(screen.getByRole("button", { name: "Change address" })).toHaveFocus()
  })
})
