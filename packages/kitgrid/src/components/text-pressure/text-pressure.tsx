"use client"

import {
  type CSSProperties,
  type ElementType,
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useMemo,
  useRef,
} from "react"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { graphemes, type TextEffectElement } from "../text-reveal/split-text.js"
import { usePlayback } from "../text-reveal/use-playback.js"

export interface TextPressureProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** The text. Assistive tech reads it once, unsplit. */
  children: string
  as?: TextEffectElement
  /** Weight far from the pointer. Needs a variable font for in-between values. */
  minWeight?: number
  /** Weight right under the pointer. */
  maxWeight?: number
  /** Vertical stretch right under the pointer, as a scale factor. */
  stretch?: number
  /** Reach of the pressure, in px. */
  radius?: number
}

/**
 * A headline that swells under the pointer: characters near it gain weight and stretch upward,
 * easing back as the pointer leaves. Values are eased per frame and written to CSS variables.
 */
export const TextPressure = forwardRef<HTMLElement, TextPressureProps>(
  (
    {
      children,
      as = "span",
      minWeight = 300,
      maxWeight = 900,
      stretch = 1.35,
      radius = 180,
      className,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const reduced = useReducedMotion()
    const active = usePlayback(local, !reduced)
    const chars = useMemo(() => graphemes(children), [children])

    useEffect(() => {
      const root = local.current
      if (!root || !active) return
      const nodes = Array.from(
        root.querySelectorAll<HTMLElement>(".kg-text-pressure__char"),
      )
      const current = nodes.map(() => 0)
      let pointer: { x: number; y: number } | null = null
      let frame = 0

      const tick = () => {
        frame = 0
        let moving = false
        nodes.forEach((node, i) => {
          let target = 0
          if (pointer) {
            const rect = node.getBoundingClientRect()
            const d = Math.hypot(
              pointer.x - (rect.left + rect.width / 2),
              pointer.y - (rect.top + rect.height / 2),
            )
            target = Math.max(0, 1 - d / radius)
            target = target * target * (3 - 2 * target)
          }
          const value = current[i] as number
          const next = value + (target - value) * 0.18
          current[i] = Math.abs(next - target) < 0.002 ? target : next
          if (current[i] !== target) moving = true
          node.style.setProperty("--_p", (current[i] as number).toFixed(3))
        })
        if (moving) frame = requestAnimationFrame(tick)
      }
      const kick = () => {
        if (!frame) frame = requestAnimationFrame(tick)
      }
      const move = (event: PointerEvent) => {
        pointer = { x: event.clientX, y: event.clientY }
        kick()
      }
      const leave = () => {
        pointer = null
        kick()
      }
      window.addEventListener("pointermove", move, { passive: true })
      document.documentElement.addEventListener("pointerleave", leave)
      return () => {
        cancelAnimationFrame(frame)
        window.removeEventListener("pointermove", move)
        document.documentElement.removeEventListener("pointerleave", leave)
        for (const node of nodes) node.style.removeProperty("--_p")
      }
    }, [active, radius, chars])

    const Tag = as as ElementType

    return (
      <Tag
        ref={ref}
        className={cx("kg-text-pressure inline-block", className)}
        style={
          {
            "--_min": minWeight,
            "--_max": maxWeight,
            "--_stretch": stretch,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <span className="kg-visually-hidden">{children}</span>
        <span className="kg-text-pressure__text" aria-hidden="true">
          {chars.map((char, i) =>
            /\s/.test(char) ? (
              char
            ) : (
              <span
                key={i}
                className="kg-text-pressure__char inline-block origin-[50%_85%] text-[color:color-mix(in_oklab,var(--kg-ink)_calc(var(--_p)_*_70%),currentColor)] [--_p:0] [font-variation-settings:'wght'_calc(var(--_min)_+_(var(--_max)_-_var(--_min))_*_var(--_p))] [font-weight:calc(var(--_min)_+_(var(--_max)_-_var(--_min))_*_var(--_p))] [scale:1_calc(1_+_(var(--_stretch)_-_1)_*_var(--_p))]"
              >
                {char}
              </span>
            ),
          )}
        </span>
      </Tag>
    )
  },
)

TextPressure.displayName = "TextPressure"
