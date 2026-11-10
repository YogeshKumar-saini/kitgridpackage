import { act, render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { Typewriter } from "./typewriter.js"
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

const typed = (container: HTMLElement) =>
  container.querySelector(".kg-typewriter__text")?.textContent

afterEach(() => {
  jest.useRealTimers()
  unstubAllGlobals()
})

describe("Typewriter", () => {
  it("reads as one stable sentence and hides the animated text", () => {
    const { container } = render(
      <Typewriter as="h2" prefix="We build" words={["stores", "apps", "brands"]} />,
    )
    expect(
      screen.getByRole("heading", { name: "We build stores, apps, brands" }),
    ).toBeVisible()
    expect(container.querySelector(".kg-typewriter__visual")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
    expect(typed(container)).toBe("stores")
  })

  it("deletes the word and types the next one while on screen", () => {
    jest.useFakeTimers()
    intersectImmediately()
    const { container } = render(
      <Typewriter words={["ab", "xyz"]} pause={100} typeSpeed={10} deleteSpeed={10} />,
    )
    act(() => jest.advanceTimersByTime(100))
    expect(typed(container)).toBe("a")
    act(() => jest.advanceTimersByTime(10))
    expect(typed(container)).toBe("")
    act(() => jest.advanceTimersByTime(20 + 10))
    expect(typed(container)).toBe("x")
    expect(container.firstElementChild).toHaveAttribute("data-typing")
    act(() => jest.advanceTimersByTime(20))
    expect(typed(container)).toBe("xyz")
  })

  it("does nothing while offscreen", () => {
    jest.useFakeTimers()
    const { container } = render(<Typewriter words={["one", "two"]} pause={50} />)
    act(() => jest.advanceTimersByTime(5000))
    expect(typed(container)).toBe("one")
  })

  it("stops on the last word when loop is off", () => {
    jest.useFakeTimers()
    intersectImmediately()
    const { container } = render(
      <Typewriter
        words={["a", "b"]}
        loop={false}
        pause={10}
        typeSpeed={5}
        deleteSpeed={5}
      />,
    )
    act(() => jest.advanceTimersByTime(1000))
    expect(typed(container)).toBe("b")
  })

  it("swaps whole words without typing under reduced motion", () => {
    jest.useFakeTimers()
    intersectImmediately()
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <Typewriter
          words={["alpha", "beta"]}
          pause={100}
          typeSpeed={10}
          deleteSpeed={10}
        />
      </KitgridProvider>,
    )
    expect(typed(container)).toBe("alpha")
    act(() => jest.advanceTimersByTime(99))
    expect(typed(container)).toBe("alpha")
    act(() => jest.advanceTimersByTime(100 + 5 * 20))
    expect(typed(container)).toBe("beta")
  })

  it("renders the requested cursor and can hide it", () => {
    const { container, rerender } = render(
      <Typewriter words={["x"]} cursor="block" cursorColor="red" />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveAttribute("data-cursor", "block")
    expect(root).toHaveAttribute("data-blink")
    expect(root.style.getPropertyValue("--kg-typewriter-cursor")).toBe("red")
    rerender(<Typewriter words={["x"]} cursor="none" />)
    expect(container.querySelector(".kg-typewriter__cursor")).toBeNull()
  })
})
