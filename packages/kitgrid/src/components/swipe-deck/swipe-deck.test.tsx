import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { SwipeDeck, type SwipeDeckProps } from "./swipe-deck.js"
import { stubGlobal, unstubAllGlobals } from "../../../test/globals.js"

interface Product {
  id: string
  title: string
}

const products: Product[] = [
  { id: "tote", title: "Waxed Canvas Tote" },
  { id: "crew", title: "Fine Merino Crew" },
  { id: "court", title: "Leather Court Sneaker" },
]

beforeEach(() => {
  stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16),
  )
  stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id))
})

afterEach(() => unstubAllGlobals())

const renderDeck = (props: Partial<SwipeDeckProps<Product>> = {}) =>
  render(
    <SwipeDeck
      items={products}
      getKey={(product) => product.id}
      itemLabel={(product) => product.title}
      renderCard={(product) => <h3>{product.title}</h3>}
      {...props}
    />,
  )

const topCard = () => screen.getByRole("group")

describe("SwipeDeck", () => {
  it("exposes only the top card, named and described", () => {
    renderDeck()
    expect(
      screen.getByRole("region", { name: "Product discovery" }),
    ).toBeInTheDocument()
    expect(topCard()).toHaveAccessibleName("Waxed Canvas Tote")
    expect(topCard()).toHaveAccessibleDescription(/left arrow to skip/)
    const behind = document.querySelectorAll("[data-deck-card]:not([data-top])")
    expect(behind).toHaveLength(2)
    for (const card of behind) {
      expect(card).toHaveAttribute("aria-hidden", "true")
      expect((card as HTMLElement).inert).toBe(true)
    }
    expect(screen.getByRole("button", { name: "Undo last swipe" })).toBeDisabled()
  })

  it("saves with the button and announces it", async () => {
    const user = userEvent.setup()
    const onSwipe = jest.fn()
    renderDeck({ onSwipe })
    await user.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(onSwipe).toHaveBeenCalledWith(products[0], "right"))
    expect(topCard()).toHaveAccessibleName("Fine Merino Crew")
    expect(screen.getByRole("status")).toHaveTextContent(
      "Saved Waxed Canvas Tote. 2 left.",
    )
  })

  it("skips and saves with the arrow keys", async () => {
    const user = userEvent.setup()
    const onSwipe = jest.fn()
    renderDeck({ onSwipe })
    topCard().focus()
    await user.keyboard("{ArrowLeft}")
    await waitFor(() => expect(onSwipe).toHaveBeenCalledWith(products[0], "left"))
    topCard().focus()
    await user.keyboard("{ArrowRight}")
    await waitFor(() => expect(onSwipe).toHaveBeenCalledWith(products[1], "right"))
  })

  it("flings a dragged card in the direction it was thrown", async () => {
    const onSwipe = jest.fn()
    renderDeck({ onSwipe })
    const card = topCard()
    fireEvent.pointerDown(card, { pointerId: 1, clientX: 100, clientY: 100, button: 0 })
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 160, clientY: 104 })
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 260, clientY: 108 })
    expect(card.style.transform).toContain("translate3d(160.00px")
    fireEvent.pointerUp(card, { pointerId: 1, clientX: 260, clientY: 108 })
    await waitFor(() => expect(onSwipe).toHaveBeenCalledWith(products[0], "right"))
  })

  it("springs back when a drag is too short", async () => {
    const width = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth")
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get: () => 320,
    })
    try {
      const onSwipe = jest.fn()
      renderDeck({ onSwipe })
      const card = topCard()
      fireEvent.pointerDown(card, {
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        button: 0,
      })
      fireEvent.pointerMove(card, { pointerId: 1, clientX: 130, clientY: 100 })
      // A pause before letting go: no release velocity, so only the distance counts.
      await new Promise((resolve) => setTimeout(resolve, 160))
      fireEvent.pointerUp(card, { pointerId: 1, clientX: 130, clientY: 100 })
      await waitFor(() => expect(card.style.transform).toBe(""), { timeout: 4000 })
      expect(onSwipe).not.toHaveBeenCalled()
    } finally {
      if (width) Object.defineProperty(HTMLElement.prototype, "offsetWidth", width)
    }
  })

  it("undoes the last swipe", async () => {
    const user = userEvent.setup()
    const onUndo = jest.fn()
    renderDeck({ onUndo })
    await user.click(screen.getByRole("button", { name: "Skip" }))
    await waitFor(() => expect(topCard()).toHaveAccessibleName("Fine Merino Crew"))
    await user.click(screen.getByRole("button", { name: "Undo last swipe" }))
    expect(onUndo).toHaveBeenCalledWith(products[0], "left")
    expect(topCard()).toHaveAccessibleName("Waxed Canvas Tote")
    expect(topCard()).toHaveAttribute("data-return", "left")
    expect(screen.getByRole("status")).toHaveTextContent("Restored Waxed Canvas Tote")
  })

  it("shows the empty slot after the last card and calls onEmpty", async () => {
    const user = userEvent.setup()
    const onEmpty = jest.fn()
    renderDeck({ onEmpty, empty: <p>All caught up</p> })
    for (const _ of products) {
      const save = screen.getByRole("button", { name: "Save" })
      await waitFor(() => expect(save).toBeEnabled())
      await user.click(save)
      await new Promise((resolve) => setTimeout(resolve, 400))
    }
    await waitFor(() => expect(screen.getByText("All caught up")).toBeInTheDocument())
    expect(onEmpty).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
  })

  it("throws without rotating under reduced motion", async () => {
    const onSwipe = jest.fn()
    render(
      <KitgridProvider reducedMotion="always">
        <SwipeDeck
          items={products}
          renderCard={(product) => product.title}
          itemLabel={(product) => product.title}
          onSwipe={onSwipe}
        />
      </KitgridProvider>,
    )
    const card = topCard()
    fireEvent.pointerDown(card, { pointerId: 1, clientX: 100, clientY: 100, button: 0 })
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 40, clientY: 100 })
    expect(card.style.transform).toContain("rotate(0.00deg)")
    fireEvent.pointerUp(card, { pointerId: 1, clientX: 40, clientY: 100 })
    await waitFor(() => expect(onSwipe).toHaveBeenCalledWith(products[0], "left"))
  })
})
