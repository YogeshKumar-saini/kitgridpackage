import { act, render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { Reveal } from "./reveal.js"
import { stubGlobal, unstubAllGlobals } from "../../../test/globals.js"

let trigger: ((visible: boolean) => void) | null = null

class ControlledObserver {
  constructor(private callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    trigger = (visible) =>
      this.callback(
        [{ isIntersecting: visible, target } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      )
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

const offscreen = {
  top: 2000,
  bottom: 2200,
  left: 0,
  right: 300,
  width: 300,
  height: 200,
}

beforeEach(() => {
  trigger = null
  stubGlobal("IntersectionObserver", ControlledObserver)
})

afterEach(() => {
  unstubAllGlobals()
  jest.restoreAllMocks()
})

const startOffscreen = () =>
  jest
    .spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockReturnValue(offscreen as DOMRect)

describe("Reveal", () => {
  it("leaves content visible when it starts on screen", () => {
    jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      ...offscreen,
      top: 10,
      bottom: 210,
    } as DOMRect)
    render(<Reveal data-testid="r">Hello</Reveal>)
    expect(screen.getByTestId("r")).not.toHaveAttribute("data-state")
    expect(screen.getByText("Hello")).toBeVisible()
  })

  it("hides offscreen content before paint and reveals it on intersection", () => {
    startOffscreen()
    render(
      <Reveal data-testid="r" variant="blur">
        Hello
      </Reveal>,
    )
    const node = screen.getByTestId("r")
    expect(node).toHaveAttribute("data-state", "hidden")
    expect(node).toHaveAttribute("data-variant", "blur")
    act(() => trigger?.(true))
    expect(node).toHaveAttribute("data-state", "visible")
  })

  it("hides again on exit when once is false", () => {
    startOffscreen()
    render(
      <Reveal data-testid="r" once={false}>
        Hello
      </Reveal>,
    )
    const node = screen.getByTestId("r")
    act(() => trigger?.(true))
    act(() => trigger?.(false))
    expect(node).toHaveAttribute("data-state", "hidden")
  })

  it("indexes direct children for a staggered cascade", () => {
    startOffscreen()
    render(
      <Reveal stagger={80} data-testid="r">
        <p>One</p>
        <p>Two</p>
      </Reveal>,
    )
    expect(screen.getByTestId("r")).toHaveAttribute("data-stagger")
    expect(screen.getByText("Two").style.getPropertyValue("--kg-reveal-index")).toBe(
      "1",
    )
    expect(
      screen.getByTestId("r").style.getPropertyValue("--kg-reveal-stagger"),
    ).toBe("80ms")
  })

  it("never hides anything under reduced motion", () => {
    startOffscreen()
    render(
      <KitgridProvider reducedMotion="always">
        <Reveal data-testid="r">Hello</Reveal>
      </KitgridProvider>,
    )
    expect(screen.getByTestId("r")).not.toHaveAttribute("data-state", "hidden")
  })
})
