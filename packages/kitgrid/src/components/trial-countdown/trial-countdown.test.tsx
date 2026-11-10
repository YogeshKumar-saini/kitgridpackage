import { render, screen } from "@testing-library/react"
import { TrialCountdown } from "./trial-countdown.js"

describe("TrialCountdown", () => {
  it("writes the days left and flags urgency", () => {
    const { container, rerender } = render(
      <TrialCountdown daysLeft={9} totalDays={14} plan="Pro trial" action={<button type="button">Upgrade</button>} />,
    )
    expect(screen.getByText("9 days left")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Upgrade" })).toBeInTheDocument()
    expect(container.firstChild).toHaveAttribute("data-state", "active")
    rerender(<TrialCountdown daysLeft={1} totalDays={14} />)
    expect(screen.getByText("1 day left")).toBeInTheDocument()
    expect(container.firstChild).toHaveAttribute("data-state", "urgent")
    rerender(<TrialCountdown daysLeft={0} totalDays={14} />)
    expect(screen.getByText("Trial ended")).toBeInTheDocument()
  })
})
