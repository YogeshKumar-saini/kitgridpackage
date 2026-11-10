import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { WebhookLog, type WebhookLogDelivery } from "./webhook-log.js"

const deliveries: WebhookLogDelivery[] = [
  { id: "d1", event: "invoice.paid", status: 200, time: "14:02", payload: '{"id":"in_1"}', response: "OK" },
  { id: "d2", event: "customer.updated", status: 500, time: "13:58", response: "Internal Server Error" },
]

describe("WebhookLog", () => {
  it("writes results out and discloses bodies on demand", async () => {
    const user = userEvent.setup()
    render(<WebhookLog deliveries={deliveries} />)
    const first = screen.getByRole("button", { name: /Succeeded, 200 invoice.paid/ })
    expect(first).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByText('{"id":"in_1"}')).not.toBeVisible()
    await user.click(first)
    expect(first).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText('{"id":"in_1"}')).toBeVisible()
    expect(screen.getByRole("button", { name: /Failed, 500 customer.updated/ })).toBeInTheDocument()
  })

  it("retries failed deliveries only", async () => {
    const user = userEvent.setup()
    const onRetry = jest.fn()
    render(<WebhookLog deliveries={deliveries} onRetry={onRetry} />)
    expect(screen.getAllByRole("button", { name: /^Retry/ })).toHaveLength(1)
    await user.click(screen.getByRole("button", { name: "Retry customer.updated" }))
    expect(onRetry).toHaveBeenCalledWith("d2")
  })
})
