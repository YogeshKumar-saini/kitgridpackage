import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { CookieBanner } from "./cookie-banner.js"

const categories = [
  { id: "necessary", label: "Necessary", required: true },
  { id: "analytics", label: "Analytics" },
  { id: "marketing", label: "Marketing" },
]

describe("CookieBanner", () => {
  it("is a named region with Accept and Reject on the first layer", () => {
    render(<CookieBanner categories={categories} onConsent={() => {}} />)
    expect(screen.getByRole("region", { name: "Cookies" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Accept all" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reject all" })).toBeInTheDocument()
  })

  it("rejects everything optional and closes", async () => {
    const onConsent = jest.fn()
    render(<CookieBanner categories={categories} onConsent={onConsent} />)
    await userEvent.click(screen.getByRole("button", { name: "Reject all" }))
    expect(onConsent).toHaveBeenCalledWith({
      necessary: true,
      analytics: false,
      marketing: false,
    })
    expect(screen.queryByRole("region")).toBeNull()
  })

  it("saves granular choices from the preferences view", async () => {
    const onConsent = jest.fn()
    render(<CookieBanner categories={categories} onConsent={onConsent} />)
    await userEvent.click(screen.getByRole("button", { name: "Customize" }))
    expect(screen.getByRole("switch", { name: "Necessary" })).toBeDisabled()
    expect(screen.getByRole("switch", { name: "Necessary" })).toBeChecked()
    await userEvent.click(screen.getByRole("switch", { name: "Analytics" }))
    await userEvent.click(screen.getByRole("button", { name: "Save choices" }))
    expect(onConsent).toHaveBeenCalledWith({
      necessary: true,
      analytics: true,
      marketing: false,
    })
  })
})
