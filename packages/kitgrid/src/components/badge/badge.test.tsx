import { render, screen } from "@testing-library/react"
import { createRef } from "react"
import { Badge } from "./badge.js"

describe("Badge", () => {
  it("exposes tone, variant and size as data attributes and forwards the ref", () => {
    const ref = createRef<HTMLSpanElement>()
    render(
      <Badge ref={ref} tone="danger" variant="solid" size="sm">
        −20%
      </Badge>,
    )
    const badge = screen.getByText("−20%")
    expect(ref.current).toBe(badge)
    expect(badge).toHaveClass("kg-badge")
    expect(badge).toHaveAttribute("data-tone", "danger")
    expect(badge).toHaveAttribute("data-variant", "solid")
    expect(badge).toHaveAttribute("data-size", "sm")
  })

  it.each(["sage", "peach", "sky", "butter", "rose"] as const)(
    "accepts the %s category paper as a tone",
    (tone) => {
      render(<Badge tone={tone}>Hot</Badge>)
      expect(screen.getByText("Hot")).toHaveAttribute("data-tone", tone)
    },
  )

  it("keeps the dot and icon out of the accessible name", () => {
    const { container } = render(
      <Badge dot pulse icon={<svg data-testid="icon" />}>
        Live
      </Badge>,
    )
    const dot = container.querySelector(".kg-badge__dot")
    expect(dot).toHaveAttribute("aria-hidden", "true")
    expect(dot).toHaveAttribute("data-pulse")
    expect(screen.getByTestId("icon").parentElement).toHaveAttribute(
      "aria-hidden",
      "true",
    )
    expect(container.firstElementChild).toHaveTextContent(/^Live$/)
  })
})
