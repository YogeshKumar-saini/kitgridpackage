"use client"

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react"
import { useEventCallback } from "../../hooks/use-event-callback.js"

export interface CartLine {
  /** Unique per line. Defaults to `productId:variantId`, so the same SKU merges into one line. */
  id: string
  productId: string
  variantId?: string
  title: string
  /** e.g. "Sage / M". */
  variantTitle?: string
  /** Unit price. */
  price: number
  /** Unit price before discount. */
  compareAt?: number
  image?: string
  quantity: number
  /** Stock or per-order limit; quantities are clamped to it. */
  maxQuantity?: number
  href?: string
}

export type CartItemInput = Omit<CartLine, "id" | "quantity"> & { id?: string }

export interface CartState {
  lines: CartLine[]
  isOpen: boolean
  /** The line most recently added through `addItem`, for "Added to cart" confirmations. */
  lastAdded: CartLine | null
}

export interface CartActions {
  /** Adds `quantity` (default 1) to the matching line, or appends a new one. */
  addItem: (item: CartItemInput, quantity?: number) => void
  removeItem: (id: string) => void
  /** Quantities of 0 or less remove the line. */
  updateQuantity: (id: string, quantity: number) => void
  /** Puts a removed line back where it was, e.g. from an "Undo" toast. */
  restoreItem: (line: CartLine, index?: number) => void
  clear: () => void
  open: () => void
  close: () => void
  setOpen: (open: boolean) => void
}

export interface CartTotals {
  /** Total number of units. */
  count: number
  subtotal: number
  /** Sum of `(compareAt − price) × quantity` over discounted lines. */
  savings: number
}

export interface CartContextValue extends CartState, CartTotals {
  currency: string
  locale: string | undefined
  freeShippingThreshold: number | undefined
}

export type CartValue = CartContextValue & CartActions

export interface CartProviderProps {
  currency?: string
  locale?: string
  initialLines?: CartLine[]
  /** Persist lines in localStorage under this key. Read after mount, so SSR output matches. */
  storageKey?: string
  /** Called with the new lines after every change the shopper makes. */
  onChange?: (lines: CartLine[]) => void
  freeShippingThreshold?: number
  children?: ReactNode
}

type CartAction =
  | { type: "add"; item: CartItemInput; quantity: number }
  | { type: "remove"; id: string }
  | { type: "update"; id: string; quantity: number }
  | { type: "restore"; line: CartLine; index: number | undefined }
  | { type: "clear" }
  | { type: "hydrate"; lines: CartLine[] }
  | { type: "open"; open: boolean }

interface ReducerState extends CartState {
  /** Bumped on shopper changes only, so hydration never echoes back to onChange or storage. */
  version: number
}

const lineId = (item: CartItemInput): string =>
  item.id ?? `${item.productId}:${item.variantId ?? ""}`

const limit = (quantity: number, max: number | undefined): number =>
  Math.max(0, Math.min(Math.floor(quantity), max ?? Number.POSITIVE_INFINITY))

const changed = (state: ReducerState, lines: CartLine[]): ReducerState => ({
  ...state,
  lines,
  version: state.version + 1,
})

const reducer = (state: ReducerState, action: CartAction): ReducerState => {
  switch (action.type) {
    case "add": {
      const id = lineId(action.item)
      const existing = state.lines.find((line) => line.id === id)
      if (existing) {
        const quantity = limit(
          existing.quantity + action.quantity,
          action.item.maxQuantity ?? existing.maxQuantity,
        )
        const line = { ...existing, ...action.item, id, quantity }
        return {
          ...changed(
            state,
            state.lines.map((entry) => (entry.id === id ? line : entry)),
          ),
          lastAdded: line,
        }
      }
      const quantity = limit(action.quantity, action.item.maxQuantity)
      if (quantity <= 0) return state
      const line: CartLine = { ...action.item, id, quantity }
      return { ...changed(state, [...state.lines, line]), lastAdded: line }
    }
    case "remove":
      if (!state.lines.some((line) => line.id === action.id)) return state
      return changed(
        state,
        state.lines.filter((line) => line.id !== action.id),
      )
    case "update": {
      const current = state.lines.find((line) => line.id === action.id)
      if (!current) return state
      const quantity = limit(action.quantity, current.maxQuantity)
      if (quantity === current.quantity) return state
      return changed(
        state,
        quantity <= 0
          ? state.lines.filter((line) => line.id !== action.id)
          : state.lines.map((line) =>
              line.id === action.id ? { ...line, quantity } : line,
            ),
      )
    }
    case "restore": {
      const rest = state.lines.filter((line) => line.id !== action.line.id)
      const at = Math.min(Math.max(action.index ?? rest.length, 0), rest.length)
      return changed(state, [...rest.slice(0, at), action.line, ...rest.slice(at)])
    }
    case "clear":
      return state.lines.length ? changed(state, []) : state
    case "hydrate":
      return { ...state, lines: action.lines }
    case "open":
      return state.isOpen === action.open ? state : { ...state, isOpen: action.open }
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

// Storage is shared with other code and other app versions, so nothing read back is trusted.
const isCartLine = (value: unknown): value is CartLine =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.productId === "string" &&
  typeof value.title === "string" &&
  typeof value.price === "number" &&
  Number.isFinite(value.price) &&
  typeof value.quantity === "number" &&
  value.quantity > 0

const readStorage = (key: string): CartLine[] | null => {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isCartLine) : null
  } catch {
    return null
  }
}

const round = (value: number) => Math.round(value * 100) / 100

/** Units, subtotal and savings for a list of lines. */
export const getCartTotals = (lines: readonly CartLine[]): CartTotals => {
  let count = 0
  let subtotal = 0
  let savings = 0
  for (const line of lines) {
    count += line.quantity
    subtotal += line.price * line.quantity
    if (line.compareAt !== undefined && line.compareAt > line.price) {
      savings += (line.compareAt - line.price) * line.quantity
    }
  }
  return { count, subtotal: round(subtotal), savings: round(savings) }
}

const CartStateContext = createContext<CartContextValue | null>(null)
const CartActionsContext = createContext<CartActions | null>(null)

/**
 * Headless cart state. State and actions live in separate contexts, so buttons that only add
 * items (`useCartActions`) never re-render when the cart changes.
 */
export const CartProvider = ({
  currency = "USD",
  locale,
  initialLines = [],
  storageKey,
  onChange,
  freeShippingThreshold,
  children,
}: CartProviderProps) => {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    lines: initialLines,
    isOpen: false,
    lastAdded: null,
    version: 0,
  }))
  const emit = useEventCallback(onChange)
  const hydrated = useRef(false)

  useEffect(() => {
    if (!storageKey) return
    const stored = readStorage(storageKey)
    if (stored) dispatch({ type: "hydrate", lines: stored })
    hydrated.current = true
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return
      dispatch({ type: "hydrate", lines: readStorage(storageKey) ?? [] })
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [storageKey])

  useEffect(() => {
    if (state.version === 0) return
    emit(state.lines)
    if (!storageKey || !hydrated.current) return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state.lines))
    } catch {
      // Quota exceeded or storage disabled: the cart keeps working for this session.
    }
  }, [state.version, state.lines, storageKey, emit])

  const actions = useMemo<CartActions>(
    () => ({
      addItem: (item, quantity = 1) => dispatch({ type: "add", item, quantity }),
      removeItem: (id) => dispatch({ type: "remove", id }),
      updateQuantity: (id, quantity) => dispatch({ type: "update", id, quantity }),
      restoreItem: (line, index) => dispatch({ type: "restore", line, index }),
      clear: () => dispatch({ type: "clear" }),
      open: () => dispatch({ type: "open", open: true }),
      close: () => dispatch({ type: "open", open: false }),
      setOpen: (open) => dispatch({ type: "open", open }),
    }),
    [],
  )

  const value = useMemo<CartContextValue>(
    () => ({
      lines: state.lines,
      isOpen: state.isOpen,
      lastAdded: state.lastAdded,
      ...getCartTotals(state.lines),
      currency,
      locale,
      freeShippingThreshold,
    }),
    [
      state.lines,
      state.isOpen,
      state.lastAdded,
      currency,
      locale,
      freeShippingThreshold,
    ],
  )

  return (
    <CartActionsContext.Provider value={actions}>
      <CartStateContext.Provider value={value}>{children}</CartStateContext.Provider>
    </CartActionsContext.Provider>
  )
}

CartProvider.displayName = "CartProvider"

/** The cart's state and actions, or `null` outside a `CartProvider`. */
export const useOptionalCart = (): CartValue | null => {
  const state = useContext(CartStateContext)
  const actions = useContext(CartActionsContext)
  return useMemo(
    () => (state && actions ? { ...state, ...actions } : null),
    [state, actions],
  )
}

/** Stable cart actions only: components using it don't re-render when lines change. */
export const useCartActions = (): CartActions | null => useContext(CartActionsContext)

export const useCart = (): CartValue => {
  const cart = useOptionalCart()
  if (!cart) throw new Error("useCart() must be called inside a <CartProvider>.")
  return cart
}
