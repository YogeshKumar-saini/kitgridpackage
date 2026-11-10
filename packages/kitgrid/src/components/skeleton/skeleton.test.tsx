import { render, screen } from "@testing-library/react"
import { Skeleton, SkeletonGroup } from "./skeleton.js"

describe("Skeleton", () => {
  it("is decorative and sizes numbers as pixels", () => {
    const { container } = render(<Skeleton shape="circle" width={48} />)
    const skeleton = container.firstElementChild as HTMLElement
    expect(skeleton).toHaveAttribute("aria-hidden", "true")
    expect(skeleton).toHaveAttribute("data-shape", "circle")
    expect(skeleton.style.width).toBe("48px")
    expect(skeleton.style.height).toBe("48px")
  })

  it("renders a paragraph with a ragged last line", () => {
    const { container } = render(<Skeleton lines={3} />)
    const lines = container.querySelectorAll(".kg-skeleton")
    expect(lines).toHaveLength(3)
    expect(lines[2]).toHaveAttribute("data-last")
    expect(lines[0]).not.toHaveAttribute("data-last")
  })

  it("paints the child as a placeholder while loading and swaps to it when done", () => {
    const { rerender } = render(
      <Skeleton loading>
        <button type="button">Checkout</button>
      </Skeleton>,
    )
    const placeholder = document.querySelector("button") as HTMLButtonElement
    expect(placeholder).toHaveClass("kg-skeleton")
    expect(placeholder).toHaveAttribute("aria-hidden", "true")
    expect(placeholder).toHaveAttribute("inert")
    expect(screen.queryByRole("button")).toBeNull()

    rerender(
      <Skeleton loading={false}>
        <button type="button">Checkout</button>
      </Skeleton>,
    )
    const button = screen.getByRole("button", { name: "Checkout" })
    expect(button).not.toHaveClass("kg-skeleton")
    expect(button).not.toHaveAttribute("aria-hidden")
  })
})

describe("SkeletonGroup", () => {
  it("marks the region busy and announces loading once", () => {
    const { container, rerender } = render(
      <SkeletonGroup data-testid="region">
        <Skeleton />
        <Skeleton lines={2} />
      </SkeletonGroup>,
    )
    const region = screen.getByTestId("region")
    expect(region).toHaveAttribute("aria-busy", "true")
    expect(screen.getAllByText("Loading")).toHaveLength(1)

    rerender(
      <SkeletonGroup data-testid="region" loading={false}>
        <p>Loaded</p>
      </SkeletonGroup>,
    )
    expect(region).not.toHaveAttribute("aria-busy")
    expect(container).not.toHaveTextContent("Loading")
  })
})
