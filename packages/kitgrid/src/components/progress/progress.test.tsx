import { render, screen } from "@testing-library/react"
import { Progress, ProgressRing } from "./progress.js"

describe("Progress", () => {
  it("is a progressbar named by its visible label with value attributes", () => {
    render(<Progress label="Uploading photos" value={42} showValue />)
    const bar = screen.getByRole("progressbar", { name: "Uploading photos" })
    expect(bar).toHaveAttribute("aria-valuenow", "42")
    expect(bar).toHaveAttribute("aria-valuemin", "0")
    expect(bar).toHaveAttribute("aria-valuemax", "100")
    expect(bar).toHaveAttribute("aria-valuetext", "42%")
    expect(screen.getByText("42%")).toHaveAttribute("aria-hidden", "true")
  })

  it("clamps the value and supports a custom range and formatter", () => {
    const { container } = render(
      <Progress
        aria-label="Steps"
        value={9}
        max={4}
        formatValue={(value, _min, max) => `Step ${value} of ${max}`}
      />,
    )
    const bar = screen.getByRole("progressbar", { name: "Steps" })
    expect(bar).toHaveAttribute("aria-valuenow", "4")
    expect(bar).toHaveAttribute("aria-valuetext", "Step 4 of 4")
    expect(container.firstElementChild).toHaveAttribute("data-state", "complete")
  })

  it("omits aria-valuenow while indeterminate", () => {
    const { container } = render(<Progress aria-label="Syncing" />)
    const bar = screen.getByRole("progressbar", { name: "Syncing" })
    expect(bar).not.toHaveAttribute("aria-valuenow")
    expect(bar).not.toHaveAttribute("aria-valuetext")
    expect(container.firstElementChild).toHaveAttribute("data-state", "indeterminate")
  })
})

describe("ProgressRing", () => {
  it("draws the remaining share as the stroke offset and shows the value", () => {
    const { container } = render(<ProgressRing label="Storage used" value={30} />)
    const ring = screen.getByRole("progressbar", { name: "Storage used" })
    expect(ring).toHaveAttribute("aria-valuenow", "30")
    expect(ring.style.getPropertyValue("--_offset")).toBe("70")
    expect(container.querySelector(".kg-progress-ring__label")).toHaveTextContent(
      "30%",
    )
  })

  it("prefers custom centre content over the value", () => {
    render(
      <ProgressRing label="Done" value={100}>
        <span>✓</span>
      </ProgressRing>,
    )
    expect(screen.getByRole("progressbar", { name: "Done" })).toHaveTextContent("✓")
  })
})
