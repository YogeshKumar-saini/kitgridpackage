"use client"

import {
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
import { type TextEffectElement, tokenize } from "../text-reveal/split-text.js"
import { usePlayback } from "../text-reveal/use-playback.js"

export type VariableProximityAxes = Record<string, number>
export type VariableProximityFalloff = "linear" | "exponential" | "gaussian"

export interface VariableProximityProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "children"
> {
  /** The text. Assistive tech reads it once, unsplit. */
  children: string
  as?: TextEffectElement
  /** Variable font axes at rest, such as `{ wght: 400 }`. */
  from?: VariableProximityAxes
  /** Axes right under the pointer, such as `{ wght: 900, wdth: 125 }`. */
  to?: VariableProximityAxes
  /** Reach of the effect, in px. */
  radius?: number
  falloff?: VariableProximityFalloff
}

const DEFAULT_FROM: VariableProximityAxes = { wght: 400 }
const DEFAULT_TO: VariableProximityAxes = { wght: 900 }

const shape = (t: number, falloff: VariableProximityFalloff) => {
  if (falloff === "exponential") return t ** 2.4
  if (falloff === "gaussian") return Math.exp(-((1 - t) ** 2) / 0.12)
  return t
}

const settings = (
  from: VariableProximityAxes,
  to: VariableProximityAxes,
  t: number,
): string =>
  Object.keys({ ...from, ...to })
    .map((axis) => {
      const a = from[axis] ?? to[axis] ?? 0
      const b = to[axis] ?? a
      return `"${axis}" ${(a + (b - a) * t).toFixed(1)}`
    })
    .join(", ")

/**
 * Inline text whose variable font axes respond to pointer distance character by character,
 * so a sentence ripples in weight, width or slant as the pointer passes over it.
 */
export const VariableProximity = forwardRef<HTMLElement, VariableProximityProps>(
  (
    {
      children,
      as = "span",
      from = DEFAULT_FROM,
      to = DEFAULT_TO,
      radius = 110,
      falloff = "linear",
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
    const tokens = useMemo(() => tokenize(children), [children])
    const rest = settings(from, to, 0)
    const key = JSON.stringify([from, to])

    useEffect(() => {
      const root = local.current
      if (!root || !active) return
      const nodes = Array.from(
        root.querySelectorAll<HTMLElement>(".kg-variable-proximity__char"),
      )
      const last = nodes.map(() => -1)
      let pointer: PointerEvent | null = null
      let frame = 0

      const flush = () => {
        frame = 0
        nodes.forEach((node, i) => {
          let t = 0
          if (pointer) {
            const rect = node.getBoundingClientRect()
            const d = Math.hypot(
              pointer.clientX - (rect.left + rect.width / 2),
              pointer.clientY - (rect.top + rect.height / 2),
            )
            t = d >= radius ? 0 : shape(1 - d / radius, falloff)
          }
          const rounded = Math.round(t * 100) / 100
          if (rounded === last[i]) return
          last[i] = rounded
          node.style.fontVariationSettings = settings(from, to, rounded)
        })
      }
      const move = (event: PointerEvent) => {
        pointer = event
        if (!frame) frame = requestAnimationFrame(flush)
      }
      const leave = () => {
        pointer = null
        if (!frame) frame = requestAnimationFrame(flush)
      }
      window.addEventListener("pointermove", move, { passive: true })
      document.documentElement.addEventListener("pointerleave", leave)
      return () => {
        cancelAnimationFrame(frame)
        window.removeEventListener("pointermove", move)
        document.documentElement.removeEventListener("pointerleave", leave)
        for (const node of nodes) node.style.fontVariationSettings = ""
      }
      // `key` stands in for the axis objects so inline literals don't restart the effect.
    }, [active, radius, falloff, key, tokens])

    const Tag = as as ElementType

    return (
      <Tag
        ref={ref}
        className={cx("kg-variable-proximity", className)}
        style={{ fontVariationSettings: rest, ...style }}
        {...props}
      >
        <span className="kg-visually-hidden">{children}</span>
        <span aria-hidden="true">
          {tokens.map((token, t) =>
            token.type === "space" ? (
              token.value
            ) : (
              <span key={t} className="kg-variable-proximity__word inline-block whitespace-nowrap">
                {token.chars.map((char, c) => (
                  <span key={c} className="kg-variable-proximity__char inline-block [font-variation-settings:inherit]">
                    {char}
                  </span>
                ))}
              </span>
            ),
          )}
        </span>
      </Tag>
    )
  },
)

VariableProximity.displayName = "VariableProximity"
