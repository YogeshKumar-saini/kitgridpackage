import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ReferralCard } from "./referral-card.js"

describe("ReferralCard", () => {
  it("shows the offer and the link in a labelled read-only field", () => {
    render(
      <ReferralCard
        title="Give $20, get $20"
        link="https://nook.shop/r/maya20"
        stats={[{ label: "Friends joined", value: 3 }]}
      />,
    )
    expect(screen.getByRole("region", { name: "Give $20, get $20" })).toBeInTheDocument()
    const field = screen.getByRole("textbox", { name: "Your referral link" })
    expect(field).toHaveValue("https://nook.shop/r/maya20")
    expect(field).toHaveAttribute("readonly")
    expect(screen.getByText("Friends joined")).toBeInTheDocument()
  })

  it("copies the link and announces it", async () => {
    const user = userEvent.setup()
    const onCopy = jest.fn()
    render(<ReferralCard title="Give $20" link="https://nook.shop/r/maya20" onCopy={onCopy} />)
    await user.click(screen.getByRole("button", { name: "Copy" }))
    expect(await navigator.clipboard.readText()).toBe("https://nook.shop/r/maya20")
    expect(onCopy).toHaveBeenCalledWith("https://nook.shop/r/maya20")
    expect(screen.getByRole("status")).toHaveTextContent("Copied")
  })
})
