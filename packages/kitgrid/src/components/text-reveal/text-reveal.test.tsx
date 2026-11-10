import { fireEvent, render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { tokenize } from "./split-text.js"
import { TextReveal } from "./text-reveal.js"
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

afterEach(() => unstubAllGlobals())

describe("TextReveal", () => {
  it("gives assistive tech the whole sentence once and hides the pieces", () => {
    const { container } = render(
      <TextReveal as="h1" split="char">
        Ship it today
      </TextReveal>,
    )
    expect(
      screen.getByRole("heading", { level: 1, name: "Ship it today" }),
    ).toBeInTheDocument()
    const visual = container.querySelector(".kg-text-reveal__text")
    expect(visual).toHaveAttribute("aria-hidden", "true")
    expect(visual).toHaveTextContent("Ship it today")
    expect(container.querySelectorAll(".kg-text-reveal__piece")).toHaveLength(11)
    expect(container.querySelectorAll(".kg-text-reveal__word")).toHaveLength(3)
  })

  it("staggers pieces with a running index and exposes timing as custom properties", () => {
    const { container } = render(
      <TextReveal effect="mask" stagger={80} delay={120} duration={500}>
        One two three
      </TextReveal>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveAttribute("data-effect", "mask")
    expect(root.style.getPropertyValue("--_stagger")).toBe("80ms")
    expect(root.style.getPropertyValue("--_delay")).toBe("120ms")
    const pieces = container.querySelectorAll<HTMLElement>(".kg-text-reveal__piece")
    expect([...pieces].map((piece) => piece.style.getPropertyValue("--_i"))).toEqual([
      "0",
      "1",
      "2",
    ])
  })

  it("holds the hidden state until the text scrolls into view", () => {
    const { container, unmount } = render(<TextReveal trigger="view">Later</TextReveal>)
    expect(container.firstElementChild).toHaveAttribute("data-state", "hidden")
    unmount()

    intersectImmediately()
    const second = render(<TextReveal trigger="view">Now</TextReveal>)
    expect(second.container.firstElementChild).toHaveAttribute("data-state", "visible")
  })

  it("shows the final state at once under reduced motion and reports completion", () => {
    const onComplete = jest.fn()
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <TextReveal trigger="view" onComplete={onComplete}>
          Calm
        </TextReveal>
      </KitgridProvider>,
    )
    expect(container.querySelector(".kg-text-reveal")).toHaveAttribute(
      "data-state",
      "visible",
    )
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it("calls onComplete when the last piece finishes animating", () => {
    const onComplete = jest.fn()
    const { container } = render(
      <TextReveal onComplete={onComplete}>Two words</TextReveal>,
    )
    const pieces = container.querySelectorAll(".kg-text-reveal__piece")
    // jsdom has no AnimationEvent, so React listens for the prefixed event name there.
    const end = (node: Element) =>
      fireEvent(node, new Event("webkitAnimationEnd", { bubbles: true }))
    end(pieces[0] as Element)
    expect(onComplete).not.toHaveBeenCalled()
    end(pieces[1] as Element)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})

describe("tokenize", () => {
  it("keeps whitespace runs and emoji clusters intact", () => {
    const tokens = tokenize("Hi  👩‍💻 there")
    expect(tokens.map((token) => token.value)).toEqual(["Hi", "  ", "👩‍💻", " ", "there"])
    expect(tokens[2]?.chars).toEqual(["👩‍💻"])
  })

  it("treats a no-break space as part of the word", () => {
    expect(tokenize("10\u00a0kg box").map((token) => token.type)).toEqual([
      "word",
      "space",
      "word",
    ])
  })
})
