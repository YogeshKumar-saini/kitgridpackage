"use client"

import {
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useEventCallback } from "../../hooks/use-event-callback.js"
import { useInView } from "../../hooks/use-in-view.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { tokenize } from "../text-reveal/split-text.js"

export type FallingTextTrigger = "click" | "hover" | "view"

export interface FallingTextProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The text. Assistive tech reads it once, whatever pile it lands in. */
  children: string
  /** What knocks the words down. With `click`, a second press stands them back up. */
  trigger?: FallingTextTrigger
  /** Words rendered with emphasis, matched case-insensitively. */
  highlight?: string[]
  /** Downward acceleration, in px per second squared. */
  gravity?: number
  /** Fraction of speed kept on each bounce, 0 to 1. */
  bounce?: number
  onSettle?: () => void
}

interface Body {
  node: HTMLElement
  x: number
  y: number
  vx: number
  vy: number
  r: number
  vr: number
  w: number
  h: number
  /** Resting position inside the container, which the transforms are relative to. */
  left: number
  top: number
  settled: boolean
}

/**
 * Words that drop out of a sentence and pile up at the bottom of their box with a little
 * bounce. A column-height model stands in for a physics engine, so landed words stack.
 */
export const FallingText = forwardRef<HTMLDivElement, FallingTextProps>(
  (
    {
      children,
      trigger = "click",
      highlight = [],
      gravity = 2600,
      bounce = 0.32,
      onSettle,
      className,
      onClick,
      onPointerEnter,
      onKeyDown,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const reduced = useReducedMotion()
    const inView = useInView(local, { once: true, amount: 0.5 })
    const [fallen, setFallen] = useState(false)
    const tokens = useMemo(() => tokenize(children), [children])
    const marked = useMemo(
      () => new Set(highlight.map((word) => word.toLowerCase())),
      [highlight],
    )
    const settle = useEventCallback(onSettle)

    useEffect(() => {
      if (trigger === "view" && inView) setFallen(true)
    }, [trigger, inView])

    useEffect(() => {
      const root = local.current
      if (!root) return
      const nodes = Array.from(
        root.querySelectorAll<HTMLElement>(".kg-falling-text__word"),
      )
      if (!fallen || reduced) {
        for (const node of nodes) node.style.transform = ""
        return
      }
      const box = root.getBoundingClientRect()
      const bodies: Body[] = nodes.map((node, i) => {
        const rect = node.getBoundingClientRect()
        const seed = Math.sin((i + 1) * 12.9898) * 43758.5453
        const rand = seed - Math.floor(seed)
        return {
          node,
          x: 0,
          y: 0,
          vx: (rand - 0.5) * 240,
          vy: -120 - rand * 160,
          r: 0,
          vr: (rand - 0.5) * 220,
          w: rect.width,
          h: rect.height,
          left: rect.left - box.left,
          top: rect.top - box.top,
          settled: false,
        }
      })
      const landed: Body[] = []
      const floorFor = (body: Body) => {
        let floor = box.height
        const a = body.left + body.x
        for (const other of landed) {
          const b = other.left + other.x
          if (a < b + other.w * 0.9 && b < a + body.w * 0.9) {
            floor = Math.min(floor, other.top + other.y)
          }
        }
        return floor
      }
      let frame = 0
      let last = performance.now()

      const step = (now: number) => {
        const dt = Math.min(Math.max((now - last) / 1000, 0), 0.032) || 1 / 60
        last = now
        let moving = false
        for (const body of bodies) {
          if (body.settled) continue
          moving = true
          body.vy += gravity * dt
          body.x += body.vx * dt
          body.y += body.vy * dt
          body.r += body.vr * dt
          const minX = -body.left
          const maxX = box.width - body.w - body.left
          if (body.x < minX || body.x > maxX) {
            body.x = Math.min(Math.max(body.x, minX), maxX)
            body.vx *= -0.5
          }
          const floor = floorFor(body)
          if (body.top + body.y + body.h >= floor) {
            body.y = floor - body.h - body.top
            body.vy *= -bounce
            body.vx *= 0.7
            body.vr *= 0.5
            if (Math.abs(body.vy) < 90) {
              body.settled = true
              body.r = Math.max(-14, Math.min(14, body.r % 360))
              landed.push(body)
            }
          }
          body.node.style.transform = `translate(${body.x.toFixed(1)}px, ${body.y.toFixed(1)}px) rotate(${body.r.toFixed(1)}deg)`
        }
        if (moving) frame = requestAnimationFrame(step)
        else settle()
      }
      frame = requestAnimationFrame(step)
      return () => cancelAnimationFrame(frame)
    }, [fallen, reduced, gravity, bounce, tokens, settle])

    const interactive = trigger !== "view"
    const toggle = () => setFallen((value) => !value)

    return (
      <div
        ref={ref}
        className={cx(
          "kg-falling-text group/falling relative block min-h-[var(--kg-falling-text-height,14rem)] overflow-hidden rounded-kg-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring data-[trigger=click]:cursor-pointer",
          className,
        )}
        data-trigger={trigger}
        data-state={fallen && !reduced ? "fallen" : "standing"}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? "button" : undefined}
        aria-pressed={interactive ? fallen : undefined}
        onClick={(event) => {
          onClick?.(event)
          if (trigger === "click") toggle()
        }}
        onPointerEnter={(event) => {
          onPointerEnter?.(event)
          if (trigger === "hover") setFallen(true)
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (interactive && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault()
            toggle()
          }
        }}
        {...props}
      >
        <span className="kg-visually-hidden">{children}</span>
        <span className="kg-falling-text__text block select-none p-6 text-center leading-normal" aria-hidden="true">
          {tokens.map((token, i) =>
            token.type === "space" ? (
              token.value
            ) : (
              <span
                key={i}
                className="kg-falling-text__word inline-block will-change-transform data-highlight:font-bold data-highlight:text-kg-ink group-data-[state=standing]/falling:transition-transform group-data-[state=standing]/falling:duration-(--kg-duration-spring) group-data-[state=standing]/falling:ease-kg-spring"
                data-highlight={marked.has(token.value.toLowerCase()) || undefined}
              >
                {token.value}
              </span>
            ),
          )}
        </span>
      </div>
    )
  },
)

FallingText.displayName = "FallingText"
