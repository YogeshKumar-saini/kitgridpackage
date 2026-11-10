import { act, render, renderHook, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { CartProvider, useCart } from "../cart/cart.js"
import { AddToCartButton } from "./add-to-cart-button.js"
import { useFlyToCart } from "./fly-to-cart.js"

const deferred = () => {
  let resolve: () => void = () => {}
  let reject: (error: unknown) => void = () => {}
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe("AddToCartButton", () => {
  afterEach(() => jest.useRealTimers())

  it("goes idle → adding → added → idle around onAdd", async () => {
    jest.useFakeTimers({ advanceTimers: true })
    const task = deferred()
    const onAdd = jest.fn(() => task.promise)
    render(<AddToCartButton onAdd={onAdd} addedDuration={1000} />)
    const button = screen.getByRole("button", { name: "Add to cart" })
    await userEvent.click(button)
    expect(button).toHaveAttribute("data-state", "adding")
    expect(button).toHaveAttribute("aria-busy", "true")
    await userEvent.click(button)
    expect(onAdd).toHaveBeenCalledTimes(1)
    await act(async () => task.resolve())
    expect(button).toHaveAttribute("data-state", "added")
    expect(button).toHaveAccessibleName("Added")
    expect(screen.getByText("Added to cart")).toBeInTheDocument()
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(button).toHaveAttribute("data-state", "idle")
  })

  it("returns to idle and reports a failed add", async () => {
    const task = deferred()
    const onError = jest.fn()
    render(<AddToCartButton onAdd={() => task.promise} onError={onError} />)
    const button = screen.getByRole("button")
    await userEvent.click(button)
    await act(async () => task.reject(new Error("409")))
    expect(button).toHaveAttribute("data-state", "idle")
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
  })

  it("is disabled with a sold-out label", () => {
    render(<AddToCartButton soldOut />)
    expect(screen.getByRole("button", { name: "Sold out" })).toBeDisabled()
  })

  it("adds its item to the surrounding cart", async () => {
    let cart: ReturnType<typeof useCart> | undefined
    const Spy = () => {
      cart = useCart()
      return null
    }
    render(
      <CartProvider>
        <AddToCartButton
          item={{ productId: "tote", title: "Tote", price: 30 }}
          quantity={2}
        />
        <Spy />
      </CartProvider>,
    )
    await userEvent.click(screen.getByRole("button"))
    expect(cart?.count).toBe(2)
  })
})

describe("useFlyToCart", () => {
  it("bumps the cart target and removes its ghost", async () => {
    const target = document.createElement("button")
    target.dataset.cartTarget = ""
    target.getBoundingClientRect = () => new DOMRect(500, 10, 40, 40)
    const bump = jest.fn(() => ({ finished: Promise.resolve() }) as unknown as Animation)
    target.animate = bump
    document.body.append(target)
    const from = document.createElement("img")
    from.src = "https://example.com/a.jpg"
    from.getBoundingClientRect = () => new DOMRect(10, 300, 200, 250)
    document.body.append(from)

    const { result } = renderHook(() => useFlyToCart())
    await act(() => result.current(from))
    expect(bump).toHaveBeenCalled()
    expect(document.querySelectorAll("img")).toHaveLength(1)
    target.remove()
    from.remove()
  })

  it("resolves quietly without a target", async () => {
    const { result } = renderHook(() => useFlyToCart())
    await expect(result.current(null)).resolves.toBeUndefined()
  })
})
