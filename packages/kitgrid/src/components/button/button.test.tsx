import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { createRef } from "react"
import { Button } from "./button.js"

describe("Button", () => {
  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "type",
      "button",
    )
  })

  it("blocks clicks and reports busy while loading", async () => {
    const onClick = jest.fn()
    render(
      <Button loading onClick={onClick}>
        Pay
      </Button>,
    )
    const button = screen.getByRole("button", { name: "Pay" })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("aria-busy", "true")
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it.each(["solid", "outline", "soft", "ghost", "danger", "link"] as const)(
    "exposes the %s variant as a data attribute",
    (variant) => {
      render(<Button variant={variant}>Go</Button>)
      expect(screen.getByRole("button", { name: "Go" })).toHaveAttribute(
        "data-variant",
        variant,
      )
    },
  )

  it("renders the child element with button styling when asChild is set", () => {
    const ref = createRef<HTMLButtonElement>()
    render(
      <Button asChild variant="outline" ref={ref}>
        <a href="/shop">Shop</a>
      </Button>,
    )
    const link = screen.getByRole("link", { name: "Shop" })
    expect(link).toHaveClass("kg-button")
    expect(link).toHaveAttribute("data-variant", "outline")
    expect(ref.current).toBe(link)
  })
})
