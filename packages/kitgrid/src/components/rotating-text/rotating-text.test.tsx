import { act, fireEvent, render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { RotatingText } from "./rotating-text.js"
import { stubGlobal, unstubAllGlobals } from "../../../test/globals.js"

const intersectImmediately = () => {
  class Observer {
    constructor(private callback: IntersectionObserverCallback) {}
    observe(target: Element) {
      this.callback(
        [{ isIntersecting: true, target } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      )
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  stubGlobal("IntersectionObserver", Observer)
}

const entering = (container: HTMLElement) =>
  container.querySelector('.kg-rotating-text__word:not([data-state="exit"])')
    ?.textContent

beforeEach(() => {
  jest.useFakeTimers()
  intersectImmediately()
})

afterEach(() => {
  jest.useRealTimers()
  unstubAllGlobals()
})

const words = ["faster", "safer", "together"]

describe("RotatingText", () => {
  it("lists every word for assistive tech and hides the moving copy", () => {
    const { container } = render(
      <h1>
        Ship <RotatingText words={words} />
      </h1>,
    )
    expect(
      screen.getByRole("heading", { name: "Ship faster, safer, together" }),
    ).toBeVisible()
    expect(container.querySelector(".kg-rotating-text__stage")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("advances on the interval, animates the old word out and reports the change", () => {
    const onChange = jest.fn()
    const { container } = render(
      <RotatingText words={words} interval={1000} onChange={onChange} />,
    )
    expect(entering(container)).toBe("faster")
    act(() => jest.advanceTimersByTime(1000))
    expect(entering(container)).toBe("safer")
    expect(container.querySelector('[data-state="exit"]')).toHaveTextContent("faster")
    expect(onChange).toHaveBeenCalledWith(1, "safer")
    act(() => jest.advanceTimersByTime(1000))
    act(() => jest.advanceTimersByTime(1000))
    expect(entering(container)).toBe("faster")
  })

  it("reserves the width of every word", () => {
    const { container, rerender } = render(<RotatingText words={words} />)
    expect(container.querySelectorAll(".kg-rotating-text__sizer")).toHaveLength(3)
    rerender(<RotatingText words={words} reserveWidth={false} />)
    expect(container.querySelectorAll(".kg-rotating-text__sizer")).toHaveLength(0)
  })

  it("holds while hovered or focused", () => {
    const { container } = render(<RotatingText words={words} interval={500} />)
    const root = container.firstElementChild as HTMLElement
    fireEvent.pointerEnter(root, { pointerType: "mouse" })
    act(() => jest.advanceTimersByTime(2000))
    expect(entering(container)).toBe("faster")
    fireEvent.pointerLeave(root, { pointerType: "mouse" })
    fireEvent.focus(root)
    act(() => jest.advanceTimersByTime(2000))
    expect(entering(container)).toBe("faster")
    fireEvent.blur(root)
    act(() => jest.advanceTimersByTime(500))
    expect(entering(container)).toBe("safer")
  })

  it("splits characters for the stagger, or moves the word whole", () => {
    const { container, rerender } = render(
      <RotatingText words={["abc"]} stagger={30} />,
    )
    expect(container.querySelectorAll(".kg-rotating-text__piece")).toHaveLength(3)
    rerender(<RotatingText words={["abc"]} stagger={0} />)
    expect(container.querySelectorAll(".kg-rotating-text__piece")).toHaveLength(1)
  })

  it("swaps without an exit animation under reduced motion", () => {
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <RotatingText words={words} interval={300} />
      </KitgridProvider>,
    )
    act(() => jest.advanceTimersByTime(300))
    expect(entering(container)).toBe("safer")
    expect(container.querySelector('[data-state="exit"]')).toBeNull()
  })
})
