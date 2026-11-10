import { act, render, screen } from "@testing-library/react"
import { Sticky } from "./sticky.js"

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void

describe("Sticky", () => {
  let fire: Callback = () => {}
  const original = globalThis.IntersectionObserver

  beforeEach(() => {
    globalThis.IntersectionObserver = jest.fn(function (this: unknown, callback: Callback) {
      fire = callback
      return { observe: jest.fn(), disconnect: jest.fn(), unobserve: jest.fn() }
    }) as unknown as typeof IntersectionObserver
  })

  afterEach(() => {
    globalThis.IntersectionObserver = original
  })

  it("marks itself stuck and reports the change", () => {
    const onStuckChange = jest.fn()
    render(
      <Sticky data-testid="s" offset={2} onStuckChange={onStuckChange}>
        Header
      </Sticky>,
    )
    const sticky = screen.getByTestId("s")
    expect(sticky).toHaveAttribute("data-edge", "top")
    act(() =>
      fire([
        {
          intersectionRatio: 0.9,
          boundingClientRect: { top: 0, bottom: 40 } as DOMRectReadOnly,
          rootBounds: { top: 0, bottom: 800 } as DOMRectReadOnly,
        },
      ]),
    )
    expect(sticky).toHaveAttribute("data-stuck")
    expect(onStuckChange).toHaveBeenLastCalledWith(true)
    act(() =>
      fire([
        {
          intersectionRatio: 1,
          boundingClientRect: { top: 200, bottom: 240 } as DOMRectReadOnly,
          rootBounds: { top: 0, bottom: 800 } as DOMRectReadOnly,
        },
      ]),
    )
    expect(sticky).not.toHaveAttribute("data-stuck")
    expect(onStuckChange).toHaveBeenLastCalledWith(false)
  })
})
