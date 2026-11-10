"use client"

import {
  type CSSProperties,
  type ElementType,
  forwardRef,
  type HTMLAttributes,
  type PointerEvent,
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
import { graphemes, type TextEffectElement, tokenize } from "../text-reveal/split-text.js"

export type ShuffleTextTrigger = "mount" | "view" | "hover"
export type ShuffleTextDirection = "up" | "down"

export interface ShuffleTextProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** The text. Assistive tech reads it once, never the reels. */
  children: string
  as?: TextEffectElement
  trigger?: ShuffleTextTrigger
  direction?: ShuffleTextDirection
  /** Glyphs each reel spins through before landing. */
  steps?: number
  /** Gap between consecutive characters starting, in ms. */
  stagger?: number
  /** Spin time of each reel, in ms. */
  duration?: number
  /** Glyphs the reels are filled with. */
  charset?: string
  onComplete?: () => void
}

const DEFAULT_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

// Deterministic per position, so server and client render the same reels.
const noise = (n: number) => {
  const s = Math.sin(n * 91.345 + 47.853) * 43758.5453
  return s - Math.floor(s)
}

const REEL = {
  up: "[transform:translateY(0)] group-data-[state=spun]/shuffle:[transform:translateY(var(--_shift))] [@media(scripting:none)]:[transform:translateY(var(--_shift))]",
  down: "[transform:translateY(var(--_shift))] group-data-[state=spun]/shuffle:[transform:translateY(0)] [@media(scripting:none)]:[transform:none]",
} as const

/**
 * Each character is a tiny slot-machine reel that spins through random glyphs and lands on its
 * letter, staggered across the word. The reels are CSS transitions on `transform`.
 */
export const ShuffleText = forwardRef<HTMLElement, ShuffleTextProps>(
  (
    {
      children,
      as = "span",
      trigger = "view",
      direction = "up",
      steps = 6,
      stagger = 40,
      duration = 700,
      charset = DEFAULT_CHARSET,
      onComplete,
      className,
      style,
      onPointerEnter,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const reduced = useReducedMotion()
    const inView = useInView(local, { once: true, amount: 0.3 })
    const [run, setRun] = useState(0)
    const [state, setState] = useState<"idle" | "spun">("idle")
    const tokens = useMemo(() => tokenize(children), [children])
    const glyphs = useMemo(() => graphemes(charset), [charset])
    const complete = useEventCallback(onComplete)
    const settled = reduced || state === "spun" || (trigger === "hover" && run === 0)

    useEffect(() => {
      if (reduced) return
      if (trigger === "mount" || (trigger === "view" && inView)) setRun((n) => n + 1)
    }, [trigger, inView, reduced])

    useEffect(() => {
      if (run === 0) return
      setState("idle")
      const node = local.current
      // Two frames: one to commit the reset without a transition, one to start the spin.
      let inner = 0
      const outer = requestAnimationFrame(() => {
        void node?.offsetWidth
        inner = requestAnimationFrame(() => setState("spun"))
      })
      const count = tokens.reduce((sum, token) => sum + token.chars.length, 0)
      const timer = window.setTimeout(complete, duration + stagger * count + 40)
      return () => {
        cancelAnimationFrame(outer)
        cancelAnimationFrame(inner)
        window.clearTimeout(timer)
      }
    }, [run, duration, stagger, tokens, complete])

    let index = 0
    const Tag = as as ElementType

    return (
      <Tag
        ref={ref}
        className={cx("kg-shuffle-text group/shuffle", className)}
        data-state={settled ? "spun" : "idle"}
        data-direction={direction}
        style={{ "--_duration": `${duration}ms`, ...style } as CSSProperties}
        onPointerEnter={(event: PointerEvent<HTMLElement>) => {
          onPointerEnter?.(event)
          if (trigger === "hover" && !reduced) setRun((n) => n + 1)
        }}
        {...props}
      >
        <span className="kg-visually-hidden">{children}</span>
        <span aria-hidden="true">
          {tokens.map((token, t) =>
            token.type === "space" ? (
              token.value
            ) : (
              <span key={t} className="kg-shuffle-text__word inline-block whitespace-nowrap">
                {token.chars.map((char, c) => {
                  const i = index++
                  const reel = Array.from(
                    { length: steps },
                    (_, s) =>
                      glyphs[Math.floor(noise(i * 31 + s) * glyphs.length)] ?? char,
                  )
                  const cells = direction === "up" ? [...reel, char] : [char, ...reel]
                  return (
                    <span
                      key={c}
                      className="kg-shuffle-text__cell relative inline-block overflow-hidden align-bottom leading-[1.15]"
                      style={
                        {
                          "--_delay": `${i * stagger}ms`,
                          "--_shift": `${(-steps / (steps + 1)) * 100}%`,
                        } as CSSProperties
                      }
                    >
                      <span className="kg-shuffle-text__sizer invisible">{char}</span>
                      <span
                        className={cx(
                          "kg-shuffle-text__reel absolute -inset-x-[0.5em] top-0 flex flex-col items-center *:h-[1.15em] group-data-[state=spun]/shuffle:[transition:transform_var(--_duration)_var(--kg-ease-out)_var(--_delay)] motion-reduce:transition-none! [[data-kg-motion=reduce]_&]:transition-none!",
                          REEL[direction],
                        )}
                      >
                        {cells.map((glyph, g) => (
                          <span key={g}>{glyph}</span>
                        ))}
                      </span>
                    </span>
                  )
                })}
              </span>
            ),
          )}
        </span>
      </Tag>
    )
  },
)

ShuffleText.displayName = "ShuffleText"
