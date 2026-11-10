import { act, fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import { QuantityStepper } from "./quantity-stepper.js"

const spin = () => screen.getByRole("spinbutton")

describe("QuantityStepper", () => {
  it("exposes spinbutton semantics and product-specific button names", () => {
    render(<QuantityStepper label="Linen shirt" defaultValue={2} max={10} />)
    const input = screen.getByLabelText("Quantity of Linen shirt")
    expect(input).toHaveAttribute("role", "spinbutton")
    expect(input).toHaveAttribute("aria-valuenow", "2")
    expect(input).toHaveAttribute("aria-valuemin", "1")
    expect(input).toHaveAttribute("aria-valuemax", "10")
    expect(screen.getByLabelText("Decrease quantity of Linen shirt").tagName).toBe(
      "BUTTON",
    )
    expect(screen.getByLabelText("Increase quantity of Linen shirt").tagName).toBe(
      "BUTTON",
    )
  })

  it("steps with the buttons and reports change and commit", async () => {
    const onValueChange = jest.fn()
    const onValueCommit = jest.fn()
    render(
      <QuantityStepper
        defaultValue={1}
        step={2}
        max={9}
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: "Increase quantity" }))
    expect(onValueChange).toHaveBeenLastCalledWith(3)
    expect(onValueCommit).toHaveBeenLastCalledWith(3)
    expect(spin()).toHaveAttribute("aria-valuenow", "3")
    await userEvent.click(screen.getByRole("button", { name: "Decrease quantity" }))
    expect(spin()).toHaveAttribute("aria-valuenow", "1")
  })

  it("activates buttons from the keyboard exactly once", async () => {
    render(<QuantityStepper defaultValue={1} />)
    screen.getByRole("button", { name: "Increase quantity" }).focus()
    await userEvent.keyboard("{Enter}")
    await userEvent.keyboard(" ")
    expect(spin()).toHaveAttribute("aria-valuenow", "3")
  })

  it("implements the spinbutton keyboard map", async () => {
    render(<QuantityStepper defaultValue={5} min={0} max={40} />)
    await userEvent.click(spin())
    await userEvent.keyboard("{ArrowUp}")
    expect(spin()).toHaveAttribute("aria-valuenow", "6")
    await userEvent.keyboard("{ArrowDown}{ArrowDown}")
    expect(spin()).toHaveAttribute("aria-valuenow", "4")
    await userEvent.keyboard("{PageUp}")
    expect(spin()).toHaveAttribute("aria-valuenow", "14")
    await userEvent.keyboard("{End}")
    expect(spin()).toHaveAttribute("aria-valuenow", "40")
    await userEvent.keyboard("{PageUp}")
    expect(spin()).toHaveAttribute("aria-valuenow", "40")
    await userEvent.keyboard("{Home}")
    expect(spin()).toHaveAttribute("aria-valuenow", "0")
    await userEvent.keyboard("{PageDown}")
    expect(spin()).toHaveAttribute("aria-valuenow", "0")
  })

  it("validates and clamps typed values on blur", async () => {
    const onValueCommit = jest.fn()
    render(<QuantityStepper defaultValue={2} max={12} onValueCommit={onValueCommit} />)
    await userEvent.click(spin())
    await userEvent.keyboard("99")
    expect(spin()).toHaveValue("99")
    await userEvent.tab()
    expect(spin()).toHaveValue("12")
    expect(onValueCommit).toHaveBeenCalledWith(12)

    await userEvent.click(spin())
    await userEvent.keyboard("{Backspace}")
    await userEvent.tab()
    expect(spin()).toHaveValue("12")
  })

  it("strips non-digits while typing and reverts on Escape", async () => {
    render(<QuantityStepper defaultValue={3} />)
    await userEvent.click(spin())
    await userEvent.keyboard("4a")
    expect(spin()).toHaveValue("4")
    await userEvent.keyboard("{Escape}")
    expect(spin()).toHaveValue("3")
  })

  it("commits typed values on Enter", async () => {
    render(<QuantityStepper defaultValue={3} />)
    await userEvent.click(spin())
    await userEvent.keyboard("7{Enter}")
    expect(spin()).toHaveAttribute("aria-valuenow", "7")
  })

  it("marks the bound buttons as unavailable without stealing focus", async () => {
    const onValueChange = jest.fn()
    render(<QuantityStepper value={1} max={1} onValueChange={onValueChange} />)
    const decrease = screen.getByRole("button", { name: "Decrease quantity" })
    const increase = screen.getByRole("button", { name: "Increase quantity" })
    expect(decrease).toHaveAttribute("aria-disabled", "true")
    expect(increase).toHaveAttribute("aria-disabled", "true")
    expect(increase).not.toBeDisabled()
    await userEvent.click(increase)
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it("turns decrease into remove at min when onRemove is set", async () => {
    const onRemove = jest.fn()
    render(<QuantityStepper label="Linen shirt" defaultValue={2} onRemove={onRemove} />)
    await userEvent.click(
      screen.getByRole("button", { name: "Decrease quantity of Linen shirt" }),
    )
    const remove = screen.getByRole("button", { name: "Remove Linen shirt" })
    expect(onRemove).not.toHaveBeenCalled()
    await userEvent.click(remove)
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it("works controlled", async () => {
    const Controlled = () => {
      const [qty, setQty] = useState(4)
      return <QuantityStepper value={qty} onValueChange={setQty} />
    }
    render(<Controlled />)
    await userEvent.click(screen.getByRole("button", { name: "Increase quantity" }))
    expect(spin()).toHaveAttribute("aria-valuenow", "5")
  })

  it("is busy and inert while loading", async () => {
    const onValueChange = jest.fn()
    const { container } = render(
      <QuantityStepper defaultValue={2} loading onValueChange={onValueChange} />,
    )
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true")
    expect(spin()).toHaveAttribute("readonly")
    await userEvent.click(screen.getByRole("button", { name: "Increase quantity" }))
    await userEvent.click(spin())
    await userEvent.keyboard("{ArrowUp}")
    expect(onValueChange).not.toHaveBeenCalled()
  })

  describe("press and hold", () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it("repeats with acceleration and commits once on release", () => {
      const onValueChange = jest.fn()
      const onValueCommit = jest.fn()
      render(
        <QuantityStepper
          defaultValue={1}
          max={99}
          onValueChange={onValueChange}
          onValueCommit={onValueCommit}
        />,
      )
      const increase = screen.getByRole("button", { name: "Increase quantity" })
      fireEvent.pointerDown(increase, { button: 0 })
      expect(onValueChange).toHaveBeenLastCalledWith(2)
      act(() => {
        jest.advanceTimersByTime(399)
      })
      expect(onValueChange).toHaveBeenCalledTimes(1)
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      const steps = onValueChange.mock.calls.length
      // Accelerating repeat: far more than the 1000 / 120 ≈ 8 steps a fixed interval would give.
      expect(steps).toBeGreaterThan(10)
      fireEvent.pointerUp(increase)
      fireEvent.click(increase, { detail: 1 })
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(onValueChange).toHaveBeenCalledTimes(steps)
      expect(onValueCommit).toHaveBeenCalledTimes(1)
      expect(onValueCommit).toHaveBeenCalledWith(steps + 1)
    })

    it("stops at the bound and never removes during a hold", () => {
      const onRemove = jest.fn()
      render(<QuantityStepper defaultValue={4} onRemove={onRemove} />)
      const decrease = screen.getByRole("button", { name: "Decrease quantity" })
      fireEvent.pointerDown(decrease, { button: 0 })
      act(() => {
        jest.advanceTimersByTime(2000)
      })
      expect(spin()).toHaveAttribute("aria-valuenow", "1")
      fireEvent.pointerUp(decrease)
      fireEvent.click(decrease, { detail: 1 })
      expect(onRemove).not.toHaveBeenCalled()
      expect(screen.getByRole("button", { name: "Remove item" })).toBe(decrease)
    })
  })
})
