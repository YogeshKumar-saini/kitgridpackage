import { act, fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ConfirmButton } from "./confirm-button.js"

describe("ConfirmButton", () => {
  afterEach(() => jest.useRealTimers())

  it("asks for a second press before confirming and announces it", async () => {
    const onConfirm = jest.fn()
    render(<ConfirmButton onConfirm={onConfirm}>Delete view</ConfirmButton>)
    const button = screen.getByRole("button", { name: "Delete view" })
    await userEvent.click(button)
    expect(onConfirm).not.toHaveBeenCalled()
    expect(button).toHaveTextContent("Click again to confirm")
    expect(screen.getByRole("status")).toHaveTextContent("Press again to confirm")
    await userEvent.click(button)
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(button).toHaveTextContent("Delete view")
  })

  it("disarms after the timeout, on Escape and on blur", () => {
    jest.useFakeTimers()
    const onConfirm = jest.fn()
    render(
      <ConfirmButton onConfirm={onConfirm} timeout={1000}>
        Delete
      </ConfirmButton>,
    )
    const button = screen.getByRole("button")
    fireEvent.click(button)
    act(() => jest.advanceTimersByTime(1000))
    expect(button).toHaveTextContent("Delete")

    fireEvent.click(button)
    fireEvent.keyDown(button, { key: "Escape" })
    expect(button).toHaveTextContent("Delete")

    fireEvent.click(button)
    fireEvent.blur(button)
    expect(button).toHaveTextContent("Delete")
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("confirms after a full hold and cancels an early release", () => {
    jest.useFakeTimers()
    const onConfirm = jest.fn()
    render(
      <ConfirmButton mode="hold" holdDuration={1000} onConfirm={onConfirm}>
        Hold to delete
      </ConfirmButton>,
    )
    const button = screen.getByRole("button", { name: "Hold to delete" })
    expect(button).toHaveAccessibleDescription("Press and hold to confirm")

    fireEvent.pointerDown(button, { button: 0 })
    expect(button).toHaveAttribute("data-holding")
    act(() => jest.advanceTimersByTime(500))
    fireEvent.pointerUp(button)
    act(() => jest.advanceTimersByTime(1000))
    expect(onConfirm).not.toHaveBeenCalled()

    fireEvent.keyDown(button, { key: " " })
    act(() => jest.advanceTimersByTime(1000))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    fireEvent.keyUp(button, { key: " " })
  })

  it("falls back to two presses for assistive tech clicks in hold mode", () => {
    const onConfirm = jest.fn()
    render(
      <ConfirmButton mode="hold" onConfirm={onConfirm}>
        Hold to delete
      </ConfirmButton>,
    )
    const button = screen.getByRole("button")
    fireEvent.click(button, { detail: 0 })
    expect(onConfirm).not.toHaveBeenCalled()
    fireEvent.click(button, { detail: 0 })
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
