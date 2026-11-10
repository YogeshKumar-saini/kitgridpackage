import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { SubscriptionSelector } from "./subscription-selector.js"

const frequencies = [
  { value: "2w", label: "2 weeks" },
  { value: "4w", label: "4 weeks" },
]

describe("SubscriptionSelector", () => {
  it("defaults to one-time and shows per-delivery prices", () => {
    render(<SubscriptionSelector price={24} discount={15} frequencies={frequencies} />)
    expect(screen.getByRole("radio", { name: /One-time purchase/ })).toBeChecked()
    expect(screen.getByRole("radio", { name: /Subscribe and save 15%/ })).toHaveAccessibleName(
      "Subscribe and save 15% $20.40 each",
    )
    expect(screen.getByRole("group", { name: "Delivery every" })).toBeDisabled()
  })

  it("enables frequency once subscribing and reports both choices", async () => {
    const onValueChange = jest.fn()
    render(
      <SubscriptionSelector
        price={24}
        discount={15}
        frequencies={frequencies}
        onValueChange={onValueChange}
      />,
    )
    await userEvent.click(screen.getByRole("radio", { name: /Subscribe/ }))
    expect(onValueChange).toHaveBeenLastCalledWith({ mode: "subscribe", frequency: "2w" })
    await userEvent.click(screen.getByRole("radio", { name: "4 weeks" }))
    expect(onValueChange).toHaveBeenLastCalledWith({ mode: "subscribe", frequency: "4w" })
  })
})
