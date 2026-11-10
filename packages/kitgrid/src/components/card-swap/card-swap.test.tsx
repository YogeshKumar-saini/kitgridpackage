import { act, fireEvent, render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { CardSwap } from "./card-swap.js"

const cards = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>(".kg-card-swap__card"))

describe("CardSwap", () => {
  it("stacks cards front first", () => {
    const { container } = render(
      <CardSwap>
        <p>Analytics</p>
        <p>Inventory</p>
        <p>Payouts</p>
      </CardSwap>,
    )
    expect(cards(container).map((card) => card.dataset.slot)).toEqual(["0", "1", "2"])
    expect(screen.getByText("Analytics")).toBeInTheDocument()
  })

  it("makes only the front card interactive", () => {
    const { container } = render(
      <CardSwap>
        <button type="button">Front</button>
        <button type="button">Back</button>
      </CardSwap>,
    )
    const [front, back] = cards(container)
    expect(front).not.toHaveAttribute("inert")
    expect(back).toHaveAttribute("inert")
  })

  it("never cycles under reduced motion", () => {
    jest.useFakeTimers()
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <CardSwap interval={100}>
          <p>One</p>
          <p>Two</p>
        </CardSwap>
      </KitgridProvider>,
    )
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(cards(container)[0]?.dataset.slot).toBe("0")
    jest.useRealTimers()
  })

  it("deals cards with the arrow keys and announces the front card", () => {
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <CardSwap aria-label="Looks">
          <p>One</p>
          <p>Two</p>
          <p>Three</p>
        </CardSwap>
      </KitgridProvider>,
    )
    const stack = screen.getByRole("group", { name: "Looks" })
    expect(stack).toHaveAttribute("tabindex", "0")
    fireEvent.keyDown(stack, { key: "ArrowRight" })
    expect(cards(container).map((card) => card.dataset.slot)).toEqual(["2", "0", "1"])
    expect(cards(container)[1]).not.toHaveAttribute("inert")
    expect(cards(container)[0]).toHaveAttribute("inert")
    expect(screen.getByText("Card 2 of 3")).toBeInTheDocument()
    fireEvent.keyDown(stack, { key: "ArrowLeft" })
    fireEvent.keyDown(stack, { key: "ArrowLeft" })
    expect(cards(container).map((card) => card.dataset.slot)).toEqual(["1", "2", "0"])
    expect(screen.getByText("Card 3 of 3")).toBeInTheDocument()
  })

  it("drops the front card before dealing the next one", () => {
    jest.useFakeTimers()
    const { container } = render(
      <CardSwap aria-label="Looks" pauseOnHover={false}>
        <p>One</p>
        <p>Two</p>
      </CardSwap>,
    )
    const stack = screen.getByRole("group", { name: "Looks" })
    fireEvent.keyDown(stack, { key: "ArrowDown" })
    expect(cards(container)[0]).toHaveAttribute("data-leaving")
    act(() => {
      jest.advanceTimersByTime(600)
    })
    expect(cards(container).map((card) => card.dataset.slot)).toEqual(["1", "0"])
    jest.useRealTimers()
  })
})
