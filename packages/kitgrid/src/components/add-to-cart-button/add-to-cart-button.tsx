"use client"

import {
  forwardRef,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react"
import { useEventCallback } from "../../hooks/use-event-callback.js"
import { cx } from "../../utils/cx.js"
import { Button, type ButtonProps } from "../button/button.js"
import { type CartItemInput, useCartActions } from "../cart/cart.js"
import { useFlyToCart } from "./fly-to-cart.js"

export type AddToCartButtonState = "idle" | "adding" | "added"

export interface AddToCartButtonLabels {
  add?: ReactNode
  adding?: ReactNode
  added?: ReactNode
  soldOut?: ReactNode
  /** Announced politely once the item is in the cart. */
  announcement?: string
}

export interface AddToCartButtonProps extends Omit<ButtonProps, "loading" | "asChild"> {
  /** Runs on click. While its promise is pending the button shows a spinner. */
  onAdd?: () => void | Promise<unknown>
  /** Added to the surrounding `CartProvider` once `onAdd` resolves. */
  item?: CartItemInput
  quantity?: number
  soldOut?: boolean
  /** How long the "Added" confirmation shows, in ms. */
  addedDuration?: number
  /** Fly this element (usually the product image) into the `[data-cart-target]` on success. */
  flyFrom?: RefObject<Element | null>
  /** Called when `onAdd` rejects. Without it the error is rethrown. */
  onError?: (error: unknown) => void
  labels?: AddToCartButtonLabels
  /** Hide the leading bag icon. */
  hideIcon?: boolean
}

const defaultLabels = {
  add: "Add to cart",
  adding: "Adding…",
  added: "Added",
  soldOut: "Sold out",
  announcement: "Added to cart",
} satisfies Required<AddToCartButtonLabels>

const BagIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Z" />
    <path d="M9 10V7a3 3 0 0 1 6 0v3" />
  </svg>
)

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    aria-hidden="true"
  >
    <path
      className="kg-add-to-cart__check [stroke-dasharray:1] [stroke-dashoffset:1] transition-[stroke-dashoffset] delay-(--kg-duration-fast) duration-(--kg-duration-slower) ease-kg-out in-data-[state=added]:[stroke-dashoffset:0]"
      d="m5 12.5 4.5 4.5L19 7.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
    />
  </svg>
)

type Face = "idle" | "adding" | "added"

/* The face each state replaces: it leaves upward while the new one rises from below. */
const outgoing: Record<Face, Face> = { idle: "added", adding: "idle", added: "adding" }

const faceClass = (face: Face, state: Face) =>
  cx(
    "kg-add-to-cart__face relative inline-flex items-center justify-center gap-2 [grid-area:1/1]",
    "transition-[opacity,translate,scale] duration-(--kg-duration-base) ease-kg-out",
    face !== state && "scale-[0.92] opacity-0",
    face !== state && (outgoing[state] === face ? "-translate-y-[70%]" : "translate-y-[70%]"),
    face === "added" && "text-kg-success-fg",
  )

/**
 * A primary "Add to cart" that morphs idle → spinner → check → idle around an async `onAdd`.
 * Every label is stacked in one grid cell, so the button keeps its width through the morph.
 */
export const AddToCartButton = forwardRef<HTMLButtonElement, AddToCartButtonProps>(
  (
    {
      onAdd,
      item,
      quantity = 1,
      soldOut = false,
      addedDuration = 1800,
      flyFrom,
      onError,
      labels,
      hideIcon = false,
      size = "lg",
      disabled,
      className,
      onClick,
      children,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const [state, setState] = useState<AddToCartButtonState>("idle")
    const cart = useCartActions()
    const fly = useFlyToCart()
    const mounted = useRef(true)
    const reportError = useEventCallback(onError)

    useEffect(() => {
      mounted.current = true
      return () => {
        mounted.current = false
      }
    }, [])

    useEffect(() => {
      if (state !== "added") return
      const timer = setTimeout(() => setState("idle"), addedDuration)
      return () => clearTimeout(timer)
    }, [state, addedDuration])

    const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (event.defaultPrevented || state !== "idle" || soldOut) return
      setState("adding")
      try {
        await onAdd?.()
      } catch (error) {
        if (mounted.current) setState("idle")
        if (onError) reportError(error)
        else throw error
        return
      }
      if (item && cart) cart.addItem(item, quantity)
      if (flyFrom?.current) void fly(flyFrom.current)
      if (mounted.current) setState("added")
    }

    const unavailable = soldOut || disabled
    const idleLabel = soldOut ? text.soldOut : (children ?? text.add)

    return (
      <>
        <Button
          ref={ref}
          size={size}
          className={cx("kg-add-to-cart overflow-hidden", className)}
          data-state={soldOut ? "sold-out" : state}
          disabled={unavailable}
          aria-busy={state === "adding" || undefined}
          onClick={(event) => void handleClick(event)}
          {...props}
        >
          <span
            className={cx(
              "kg-add-to-cart__fill pointer-events-none absolute inset-0 bg-kg-success transition-opacity duration-(--kg-duration-base) ease-kg-out",
              state === "added" && !soldOut ? "opacity-100" : "opacity-0",
            )}
            aria-hidden="true"
          />
          <span className="kg-add-to-cart__stack grid place-items-center">
            <span
              className={faceClass("idle", soldOut ? "idle" : state)}
              data-face="idle"
              aria-hidden={state !== "idle"}
            >
              {!hideIcon && !soldOut && <BagIcon />}
              {idleLabel}
            </span>
            <span
              className={faceClass("adding", soldOut ? "idle" : state)}
              data-face="adding"
              aria-hidden={state !== "adding"}
            >
              <span
                className={cx(
                  "kg-add-to-cart__spinner size-[1em] rounded-full border-2 border-current border-e-transparent",
                  state === "adding" &&
                    "animate-spin [animation-duration:0.7s] motion-reduce:[animation-duration:1.6s]",
                )}
                aria-hidden="true"
              />
              {text.adding}
            </span>
            <span
              className={faceClass("added", soldOut ? "idle" : state)}
              data-face="added"
              aria-hidden={state !== "added"}
            >
              <CheckIcon />
              {text.added}
            </span>
          </span>
        </Button>
        <span className="kg-visually-hidden" aria-live="polite">
          {state === "added" ? text.announcement : ""}
        </span>
      </>
    )
  },
)

AddToCartButton.displayName = "AddToCartButton"
