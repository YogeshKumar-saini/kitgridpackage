import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { OnboardingChecklist } from "./onboarding-checklist.js"

const steps = [
  { id: "connect", label: "Connect a source", done: true },
  { id: "model", label: "Build a model", description: "Pick a table.", action: <button type="button">Start</button> },
  { id: "share", label: "Share a dashboard", description: "Invite a teammate." },
]

describe("OnboardingChecklist", () => {
  it("reports progress and opens the first unfinished step", () => {
    render(<OnboardingChecklist steps={steps} />)
    expect(screen.getByRole("region", { name: "Get set up" })).toBeInTheDocument()
    const progress = screen.getByRole("progressbar", { name: "Get set up" })
    expect(progress).toHaveAttribute("aria-valuenow", "1")
    expect(progress).toHaveAttribute("aria-valuetext", "1 of 3")
    expect(screen.getByRole("button", { name: "Connect a source, done" })).not.toHaveAttribute("aria-expanded")
    expect(screen.getByRole("button", { name: "Build a model" })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("button", { name: "Share a dashboard" })).toHaveAttribute("aria-expanded", "false")
  })

  it("switches the open step and dismisses", async () => {
    const user = userEvent.setup()
    const onDismiss = jest.fn()
    render(<OnboardingChecklist steps={steps} onDismiss={onDismiss} />)
    await user.click(screen.getByRole("button", { name: "Share a dashboard" }))
    expect(screen.getByRole("button", { name: "Share a dashboard" })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("button", { name: "Build a model" })).toHaveAttribute("aria-expanded", "false")
    await user.click(screen.getByRole("button", { name: "Dismiss checklist" }))
    expect(onDismiss).toHaveBeenCalled()
  })
})
