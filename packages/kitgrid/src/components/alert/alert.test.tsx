import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Alert } from "./alert.js"

describe("Alert", () => {
  it("interrupts for danger and warning, waits politely otherwise", () => {
    render(
      <>
        <Alert tone="danger" title="Payment failed" />
        <Alert tone="warning" title="Low stock" />
        <Alert tone="success" title="Saved" />
        <Alert title="Heads up" />
      </>,
    )
    expect(screen.getAllByRole("alert")).toHaveLength(2)
    expect(screen.getAllByRole("status")).toHaveLength(2)
  })

  it("lets the role be overridden", () => {
    render(<Alert tone="danger" role="note" title="Archived" />)
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByRole("note")).toHaveTextContent("Archived")
  })

  it("renders a labelled dismiss button only with onDismiss", async () => {
    const onDismiss = jest.fn()
    const { rerender } = render(<Alert title="Update ready">Restart to apply.</Alert>)
    expect(screen.queryByRole("button")).toBeNull()

    rerender(
      <Alert title="Update ready" onDismiss={onDismiss} dismissLabel="Dismiss update">
        Restart to apply.
      </Alert>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Dismiss update" }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it("hides the icon with icon={false} and keeps a custom icon decorative", () => {
    const { container, rerender } = render(<Alert icon={false} title="Plain" />)
    expect(container.querySelector(".kg-alert__icon")).toBeNull()
    rerender(<Alert icon={<svg data-testid="custom" />} title="Custom" />)
    expect(screen.getByTestId("custom").parentElement).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })
})
