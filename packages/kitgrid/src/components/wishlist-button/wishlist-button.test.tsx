import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import { WishlistButton } from "./wishlist-button.js"

describe("WishlistButton", () => {
  it("is a toggle button with a stable name", async () => {
    render(<WishlistButton />)
    const button = screen.getByRole("button", { name: "Add to wishlist" })
    expect(button).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(button)
    expect(button).toHaveAttribute("aria-pressed", "true")
    expect(button).toHaveAccessibleName("Add to wishlist")
  })

  it("announces additions and removals politely", async () => {
    render(<WishlistButton />)
    const status = screen.getByRole("status")
    expect(status).toBeEmptyDOMElement()
    await userEvent.click(screen.getByRole("button"))
    expect(status).toHaveTextContent("Added to wishlist")
    await userEvent.click(screen.getByRole("button"))
    expect(status).toHaveTextContent("Removed from wishlist")
  })

  it("bursts only on user activation, not when rendered pressed", async () => {
    const { container } = render(<WishlistButton defaultPressed />)
    expect(container.querySelector(".kg-wishlist-button__burst")).toBeNull()
    await userEvent.click(screen.getByRole("button"))
    expect(container.querySelector(".kg-wishlist-button__burst")).toBeNull()
    await userEvent.click(screen.getByRole("button"))
    expect(container.querySelector(".kg-wishlist-button__burst")).not.toBeNull()
  })

  it("works controlled and reports changes", async () => {
    const onPressedChange = jest.fn()
    const Controlled = () => {
      const [saved, setSaved] = useState(true)
      return (
        <WishlistButton
          pressed={saved}
          onPressedChange={(next) => {
            onPressedChange(next)
            setSaved(next)
          }}
        />
      )
    }
    render(<Controlled />)
    await userEvent.click(screen.getByRole("button"))
    expect(onPressedChange).toHaveBeenCalledWith(false)
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false")
  })

  it("shows state text in the inline variant and accepts custom labels", async () => {
    render(
      <WishlistButton
        variant="inline"
        labels={{ label: "Save Linen shirt", inline: "Save", inlinePressed: "Saved" }}
      />,
    )
    const button = screen.getByRole("button", { name: "Save Linen shirt" })
    expect(button).toHaveTextContent("Save")
    await userEvent.keyboard("{Tab}{Enter}")
    expect(button).toHaveTextContent("Saved")
    expect(button).toHaveAttribute("aria-pressed", "true")
  })

  it("lets onClick cancel the toggle", async () => {
    render(<WishlistButton onClick={(event) => event.preventDefault()} />)
    await userEvent.click(screen.getByRole("button"))
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false")
  })
})
