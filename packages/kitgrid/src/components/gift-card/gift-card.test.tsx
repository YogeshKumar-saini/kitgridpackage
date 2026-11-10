import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { GiftCard } from "./gift-card.js"

describe("GiftCard", () => {
  it("announces the balance and hides the code until revealed", async () => {
    render(<GiftCard amount={50} brand="Field & Co" code="GIFT-7Q2X" />)
    expect(screen.getByText("Gift card balance")).toBeInTheDocument()
    expect(screen.getByText("Code hidden")).toBeInTheDocument()
    expect(screen.queryByText("GIFT-7Q2X")).toBeNull()
    const reveal = screen.getByRole("button", { name: "Show code" })
    await userEvent.click(reveal)
    expect(reveal).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByText("GIFT-7Q2X")).toBeInTheDocument()
  })

  it("copies the code and confirms", async () => {
    const user = userEvent.setup()
    render(<GiftCard amount={50} code="GIFT-7Q2X" />)
    await user.click(screen.getByRole("button", { name: "Copy code" }))
    expect(await navigator.clipboard.readText()).toBe("GIFT-7Q2X")
    expect(screen.getByRole("status")).toHaveTextContent("Code copied")
  })
})
