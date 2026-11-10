import { render, screen } from "@testing-library/react"
import { Switcher } from "./switcher.js"

describe("Switcher", () => {
  it("carries the threshold and gap to its stylesheet", () => {
    render(<Switcher data-testid="switcher" threshold="40rem" gap={2} />)
    const switcher = screen.getByTestId("switcher")
    expect(switcher).toHaveClass("kg-switcher")
    expect(switcher.style.getPropertyValue("--_threshold")).toBe("40rem")
    expect(switcher.style.getPropertyValue("--_gap")).toBe("calc(var(--kg-space) * 2)")
  })
})
