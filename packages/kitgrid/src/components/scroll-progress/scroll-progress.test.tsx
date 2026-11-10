import { fireEvent, render } from "@testing-library/react"
import { useRef } from "react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { ScrollProgress } from "./scroll-progress.js"

const Scroller = () => {
  const target = useRef<HTMLDivElement>(null)
  return (
    <div ref={target} data-testid="scroller">
      <ScrollProgress target={target} position="static" />
    </div>
  )
}

describe("ScrollProgress", () => {
  it("is decorative and pinned to the top by default", () => {
    const { container } = render(<ScrollProgress />)
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveAttribute("aria-hidden", "true")
    expect(root).toHaveAttribute("data-position", "top")
    expect(root.style.getPropertyValue("--_p")).toBe("0.0000")
  })

  it("tracks a scroll container", () => {
    const { getByTestId, container } = render(<Scroller />)
    const scroller = getByTestId("scroller")
    Object.defineProperty(scroller, "scrollHeight", { value: 1000 })
    Object.defineProperty(scroller, "clientHeight", { value: 200 })
    scroller.scrollTop = 400
    fireEvent.scroll(scroller)
    const bar = container.querySelector(".kg-scroll-progress") as HTMLElement
    return new Promise<void>((resolve) =>
      requestAnimationFrame(() => {
        expect(bar.style.getPropertyValue("--_p")).toBe("0.5000")
        resolve()
      }),
    )
  })

  it("follows the scroll one to one, without easing, under reduced motion", () => {
    const { getByTestId, container } = render(
      <KitgridProvider reducedMotion="always">
        <Scroller />
      </KitgridProvider>,
    )
    const scroller = getByTestId("scroller")
    Object.defineProperty(scroller, "scrollHeight", { value: 1000 })
    Object.defineProperty(scroller, "clientHeight", { value: 200 })
    scroller.scrollTop = 200
    fireEvent.scroll(scroller)
    const bar = container.querySelector(".kg-scroll-progress") as HTMLElement
    expect(bar.querySelector(".kg-scroll-progress__bar")).toHaveClass("transition-none")
    return new Promise<void>((resolve) =>
      requestAnimationFrame(() => {
        expect(bar.style.getPropertyValue("--_p")).toBe("0.2500")
        resolve()
      }),
    )
  })
})
