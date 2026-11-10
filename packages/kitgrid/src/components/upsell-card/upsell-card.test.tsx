import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { UpsellCard } from "./upsell-card.js"

describe("UpsellCard", () => {
  it("adds the product once and announces it", async () => {
    const onAdd = jest.fn(async () => {})
    render(<UpsellCard name="Wool socks" price={18} reason="Pairs well" onAdd={onAdd} />)
    await userEvent.click(screen.getByRole("button", { name: "Add Wool socks" }))
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole("button", { name: "Added: Wool socks" })).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Wool socks added")
    await userEvent.click(screen.getByRole("button", { name: "Added: Wool socks" }))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it("can be dismissed", async () => {
    const onDismiss = jest.fn()
    render(<UpsellCard name="Wool socks" price={18} onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole("button", { name: "Not interested: Wool socks" }))
    expect(onDismiss).toHaveBeenCalled()
  })
})

describe("UpsellCard media", () => {
  it("marks the image slot as a placeholder without an image", () => {
    const { container } = render(<UpsellCard name="Wool socks" price={18} />)
    expect(container.querySelector(".kg-upsell-card__image")).toHaveAttribute("data-placeholder")
  })
})
