import { act, render, screen } from "@testing-library/react"
import { FetchProgress } from "./fetch-progress.js"

describe("FetchProgress", () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it("waits for the delay before showing, so fast requests never flash", () => {
    render(<FetchProgress delay={300} label="Updating data" />)
    expect(screen.queryByRole("progressbar")).toBeNull()
    act(() => jest.advanceTimersByTime(300))
    const bar = screen.getByRole("progressbar", { name: "Updating data" })
    expect(bar).toHaveAttribute("data-mode", "indeterminate")
    expect(bar).not.toHaveAttribute("aria-valuenow")
  })

  it("reports a known value and clamps it", () => {
    const { rerender } = render(<FetchProgress delay={0} value={42.4} />)
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "42")
    rerender(<FetchProgress delay={0} value={140} />)
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100")
  })

  it("goes away when work finishes before the delay", () => {
    const { rerender } = render(<FetchProgress delay={300} />)
    act(() => jest.advanceTimersByTime(100))
    rerender(<FetchProgress delay={300} active={false} />)
    act(() => jest.advanceTimersByTime(500))
    expect(screen.queryByRole("progressbar")).toBeNull()
  })
})
