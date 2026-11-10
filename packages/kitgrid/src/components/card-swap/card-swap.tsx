"use client"

import {
  Children,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { usePlayback } from "../text-reveal/use-playback.js"

export interface CardSwapProps extends HTMLAttributes<HTMLDivElement> {
  /** The cards, front first. Each child becomes one card. */
  children: ReactNode
  /** Time each card spends in front, in ms. */
  interval?: number
  /** Horizontal step between stacked cards, in px. */
  offsetX?: number
  /** Vertical step between stacked cards, in px. */
  offsetY?: number
  /** Skew of the stack, in degrees. */
  skew?: number
  /** Hold the current card while the pointer or focus is inside. */
  pauseOnHover?: boolean
}

const DROP_MS = 520

/**
 * A skewed 3D stack that drops its front card out of view and slides it in at the back, on a
 * loop. Only the front card is interactive; the stack is one tab stop whose arrow keys deal
 * the next or previous card. The loop idles offscreen and stops under reduced motion.
 */
export const CardSwap = forwardRef<HTMLDivElement, CardSwapProps>(
  (
    {
      children,
      interval = 3600,
      offsetX = 44,
      offsetY = 40,
      skew = 4,
      pauseOnHover = true,
      className,
      style,
      onPointerEnter,
      onPointerLeave,
      onFocus,
      onBlur,
      onKeyDown,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const cards = Children.toArray(children)
    const n = cards.length
    const reduced = useReducedMotion()
    const [paused, setPaused] = useState(false)
    const playing = usePlayback(local, !reduced && !paused && n > 1)
    const [order, setOrder] = useState(() => cards.map((_, i) => i))
    const [leaving, setLeaving] = useState<number | null>(null)
    const [announce, setAnnounce] = useState(false)
    const orderRef = useRef(order)
    orderRef.current = order
    const leavingRef = useRef(leaving)
    leavingRef.current = leaving
    const dropTimer = useRef(0)

    useEffect(() => () => window.clearTimeout(dropTimer.current), [])

    const next = (animate: boolean) => {
      if (leavingRef.current !== null) return
      const rotate = () =>
        setOrder(([first, ...rest]) => (first === undefined ? rest : [...rest, first]))
      if (!animate) {
        rotate()
        return
      }
      setLeaving(orderRef.current[0] ?? null)
      dropTimer.current = window.setTimeout(() => {
        rotate()
        setLeaving(null)
      }, DROP_MS)
    }

    const previous = () => {
      if (leavingRef.current !== null) return
      setOrder((current) => {
        const last = current[current.length - 1]
        return last === undefined ? current : [last, ...current.slice(0, -1)]
      })
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented || event.target !== event.currentTarget || n < 2) return
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault()
        setAnnounce(true)
        next(!reduced)
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault()
        setAnnounce(true)
        previous()
      }
    }

    useEffect(() => {
      setOrder((current) =>
        current.length === n ? current : Array.from({ length: n }, (_, i) => i),
      )
    }, [n])

    useEffect(() => {
      if (!playing) return
      const timer = window.setInterval(() => next(true), interval)
      return () => {
        window.clearInterval(timer)
        window.clearTimeout(dropTimer.current)
        if (leavingRef.current !== null) {
          setOrder(([first, ...rest]) => (first === undefined ? rest : [...rest, first]))
          setLeaving(null)
        }
      }
    }, [playing, interval])

    useEffect(() => {
      const root = local.current
      if (!root) return
      root
        .querySelectorAll<HTMLElement>(":scope > .kg-card-swap__card")
        .forEach((node) => node.toggleAttribute("inert", node.dataset.slot !== "0"))
    }, [order])

    const hold = (value: boolean) => {
      if (pauseOnHover) setPaused(value)
    }

    return (
      <div
        ref={ref}
        className={cx(
          "kg-card-swap relative h-[var(--kg-card-swap-height,15rem)] w-[var(--kg-card-swap-width,22rem)] max-w-full rounded-kg-xl [perspective:1100px] [transform-style:preserve-3d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-kg-ring",
          className,
        )}
        role="group"
        aria-roledescription="card stack"
        tabIndex={n > 1 ? 0 : undefined}
        style={
          {
            "--_dx": `${offsetX}px`,
            "--_dy": `${offsetY}px`,
            "--_skew": `${skew}deg`,
            "--_drop": `${DROP_MS}ms`,
            ...style,
          } as CSSProperties
        }
        onPointerEnter={(event) => {
          onPointerEnter?.(event)
          hold(true)
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event)
          hold(false)
        }}
        onFocus={(event) => {
          onFocus?.(event)
          hold(true)
        }}
        onBlur={(event) => {
          onBlur?.(event)
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            hold(false)
            setAnnounce(false)
          }
        }}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {cards.map((card, i) => {
          const slot = Math.max(order.indexOf(i), 0)
          return (
            <div
              key={i}
              className="kg-card-swap__card absolute inset-0 overflow-hidden rounded-kg-xl border-2 border-kg-ink bg-kg-surface-raised shadow-kg-md transition-[transform,opacity] duration-(--kg-duration-slower) ease-kg-out [transform:translate3d(calc(var(--_slot)_*_var(--_dx)),calc(var(--_slot)_*_var(--_dy)_*_-1),calc(var(--_slot)_*_-70px))_skewY(var(--_skew))] not-data-[slot=0]:pointer-events-none data-leaving:duration-(--_drop) data-leaving:ease-[var(--kg-ease-in)] data-leaving:[transform:translate3d(0,115%,40px)_rotate(-4deg)_skewY(var(--_skew))] motion-reduce:transition-none [[data-kg-motion=reduce]_&]:transition-none"
              data-slot={slot}
              data-leaving={leaving === i || undefined}
              style={{ "--_slot": slot, zIndex: n - slot } as CSSProperties}
            >
              {card}
            </div>
          )
        })}
        <span className="kg-visually-hidden" aria-live="polite">
          {announce ? `Card ${(order[0] ?? 0) + 1} of ${n}` : ""}
        </span>
      </div>
    )
  },
)

CardSwap.displayName = "CardSwap"
