import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { createRef } from "react"
import { ShimmerButton } from "./shimmer-button.js"

describe("ShimmerButton", () => {
  it("is a native button that never submits by accident", async () => {
    const onClick = jest.fn()
    render(<ShimmerButton onClick={onClick}>Start free trial</ShimmerButton>)
    const button = screen.getByRole("button", { name: "Start free trial" })
    expect(button).toHaveAttribute("type", "button")
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("maps its props to CSS variables and data attributes", () => {
    render(
      <ShimmerButton
        shimmerColor="gold"
        duration={5}
        background="navy"
        radius={8}
        size="lg"
      >
        Go
      </ShimmerButton>,
    )
    const button = screen.getByRole("button")
    expect(button).toHaveAttribute("data-size", "lg")
    expect(button.style.getPropertyValue("--kg-shimmer-color")).toBe("gold")
    expect(button.style.getPropertyValue("--kg-shimmer-duration")).toBe("5s")
    expect(button.style.getPropertyValue("--kg-shimmer-bg")).toBe("navy")
    expect(button.style.getPropertyValue("--kg-shimmer-radius")).toBe("8px")
  })

  it("pauses while it has not been seen on screen", () => {
    render(<ShimmerButton>Go</ShimmerButton>)
    expect(screen.getByRole("button")).toHaveAttribute("data-paused")
  })

  it("renders the child with the effect when asChild is set", () => {
    const ref = createRef<HTMLButtonElement>()
    render(
      <ShimmerButton asChild ref={ref}>
        <a href="/pricing">Pricing</a>
      </ShimmerButton>,
    )
    const link = screen.getByRole("link", { name: "Pricing" })
    expect(link).toHaveClass("kg-shimmer-button")
    expect(link).not.toHaveAttribute("type")
    expect(ref.current).toBe(link)
  })
})
