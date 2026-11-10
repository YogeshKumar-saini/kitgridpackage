import { act, render, renderHook, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import {
  type CartLine,
  CartProvider,
  type CartProviderProps,
  getCartTotals,
  useCart,
  useCartActions,
} from "./cart.js"

const shirt = {
  productId: "shirt",
  variantId: "sage-m",
  title: "Linen shirt",
  price: 68,
  compareAt: 85,
}
const mug = { productId: "mug", title: "Mug", price: 24, maxQuantity: 2 }

const wrap =
  (props: Partial<CartProviderProps> = {}) =>
  ({ children }: { children: ReactNode }) => (
    <CartProvider {...props}>{children}</CartProvider>
  )

describe("CartProvider / useCart", () => {
  beforeEach(() => window.localStorage.clear())

  it("adds, merges the same SKU, clamps to maxQuantity and derives totals", () => {
    const { result } = renderHook(() => useCart(), { wrapper: wrap() })
    act(() => result.current.addItem(shirt))
    act(() => result.current.addItem(shirt, 2))
    act(() => result.current.addItem(mug, 5))
    expect(result.current.lines).toHaveLength(2)
    expect(result.current.lines[0]).toMatchObject({ id: "shirt:sage-m", quantity: 3 })
    expect(result.current.lines[1]?.quantity).toBe(2)
    expect(result.current.count).toBe(5)
    expect(result.current.subtotal).toBe(68 * 3 + 24 * 2)
    expect(result.current.savings).toBe(17 * 3)
    expect(result.current.lastAdded?.id).toBe("mug:")
  })

  it("updates, removes at zero, restores in place and clears", () => {
    const { result } = renderHook(() => useCart(), { wrapper: wrap() })
    act(() => {
      result.current.addItem(shirt)
      result.current.addItem(mug)
    })
    const removed = result.current.lines[0] as CartLine
    act(() => result.current.removeItem(removed.id))
    expect(result.current.lines.map((line) => line.productId)).toEqual(["mug"])
    act(() => result.current.restoreItem(removed, 0))
    expect(result.current.lines.map((line) => line.productId)).toEqual(["shirt", "mug"])
    act(() => result.current.updateQuantity("mug:", 0))
    expect(result.current.lines).toHaveLength(1)
    act(() => result.current.clear())
    expect(result.current.count).toBe(0)
  })

  it("opens and closes", () => {
    const { result } = renderHook(() => useCart(), { wrapper: wrap() })
    act(() => result.current.open())
    expect(result.current.isOpen).toBe(true)
    act(() => result.current.close())
    expect(result.current.isOpen).toBe(false)
  })

  it("persists to localStorage, hydrates after mount and drops malformed lines", () => {
    const onChange = jest.fn()
    const first = renderHook(() => useCart(), {
      wrapper: wrap({ storageKey: "cart", onChange }),
    })
    act(() => first.result.current.addItem(shirt))
    expect(onChange).toHaveBeenCalledTimes(1)
    const stored: unknown[] = JSON.parse(window.localStorage.getItem("cart") ?? "[]")
    expect(stored).toHaveLength(1)
    first.unmount()

    window.localStorage.setItem("cart", JSON.stringify([...stored, { id: 3 }]))
    const second = renderHook(() => useCart(), {
      wrapper: wrap({ storageKey: "cart" }),
    })
    expect(second.result.current.lines).toHaveLength(1)
    expect(second.result.current.lines[0]?.title).toBe("Linen shirt")
  })

  it("survives corrupt storage", () => {
    window.localStorage.setItem("cart", "{not json")
    const { result } = renderHook(() => useCart(), {
      wrapper: wrap({
        storageKey: "cart",
        initialLines: [{ ...mug, id: "m", quantity: 1 }],
      }),
    })
    expect(result.current.lines).toHaveLength(1)
  })

  it("keeps action identities stable across cart changes", () => {
    const seen = new Set<unknown>()
    const Probe = () => {
      seen.add(useCartActions())
      return null
    }
    const Adder = () => {
      const cart = useCart()
      return (
        <button type="button" onClick={() => cart.addItem(mug)}>
          {cart.count}
        </button>
      )
    }
    render(
      <CartProvider>
        <Probe />
        <Adder />
      </CartProvider>,
    )
    act(() => screen.getByRole("button").click())
    expect(screen.getByRole("button")).toHaveTextContent("1")
    expect(seen.size).toBe(1)
  })

  it("throws a helpful error outside a provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {})
    expect(() => renderHook(() => useCart())).toThrow(/CartProvider/)
    spy.mockRestore()
  })

  it("computes totals without a provider", () => {
    expect(getCartTotals([{ ...shirt, id: "a", quantity: 2 }])).toEqual({
      count: 2,
      subtotal: 136,
      savings: 34,
    })
  })
})
