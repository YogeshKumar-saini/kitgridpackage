"use client"

import {
  type ElementType,
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useId,
  useRef,
} from "react"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import type { TextEffectElement } from "../text-reveal/split-text.js"
import { usePlayback } from "../text-reveal/use-playback.js"

export interface MorphingTextProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Words or short phrases to melt between, in order. */
  texts: string[]
  as?: TextEffectElement
  /** Length of each melt, in ms. */
  morph?: number
  /** Time each text holds before melting into the next, in ms. */
  hold?: number
}

/**
 * Melts one word into the next: two layers cross-blur while an SVG alpha-threshold filter
 * fuses their edges into one liquid shape. Under reduced motion the first text stays put.
 */
export const MorphingText = forwardRef<HTMLElement, MorphingTextProps>(
  ({ texts, as = "span", morph = 1100, hold = 1400, className, ...props }, forwardedRef) => {
    const local = useRef<HTMLElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const aRef = useRef<HTMLSpanElement>(null)
    const bRef = useRef<HTMLSpanElement>(null)
    const reduced = useReducedMotion()
    const playing = usePlayback(local, !reduced && texts.length > 1)
    const filter = `kg-morph-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`
    const key = texts.join("\u0000")

    useEffect(() => {
      const a = aRef.current
      const b = bRef.current
      if (!a || !b) return
      const reset = () => {
        a.textContent = texts[0] ?? ""
        b.textContent = ""
        a.style.filter = b.style.filter = ""
        a.style.opacity = "1"
        b.style.opacity = "0"
      }
      if (!playing) {
        if (reduced) reset()
        return
      }
      let index = 0
      let start = -1
      let frame = 0

      const paint = (t: number) => {
        // Blur grows without bound as a layer fades out, which is what lets the threshold fuse them.
        const show = (node: HTMLElement, f: number) => {
          node.style.opacity = `${f ** 0.4}`
          node.style.filter = f >= 1 ? "" : `blur(${Math.min(8 / Math.max(f, 0.01) - 8, 100)}px)`
        }
        show(b, t)
        show(a, 1 - t)
        const layers = a.parentElement
        if (layers) layers.style.filter = t > 0 ? `url(#${filter})` : ""
      }

      const tick = (now: number) => {
        if (start < 0) start = now
        const elapsed = now - start
        if (elapsed < hold) {
          paint(0)
        } else if (elapsed < hold + morph) {
          paint((elapsed - hold) / morph)
        } else {
          index = (index + 1) % texts.length
          a.textContent = texts[index] ?? ""
          b.textContent = texts[(index + 1) % texts.length] ?? ""
          paint(0)
          start = now
        }
        frame = requestAnimationFrame(tick)
      }
      a.textContent = texts[index] ?? ""
      b.textContent = texts[(index + 1) % texts.length] ?? ""
      frame = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(frame)
      // `key` stands in for the array so inline literals don't restart the cycle.
    }, [playing, reduced, morph, hold, key, filter])

    const Tag = as as ElementType
    const longest = texts.reduce((best, text) => (text.length > best.length ? text : best), "")

    return (
      <Tag ref={ref} className={cx("kg-morphing-text inline-block", className)} {...props}>
        <span className="kg-visually-hidden">{texts.join(", ")}</span>
        <span className="kg-morphing-text__stage relative inline-grid place-items-center" aria-hidden="true">
          <span className="kg-morphing-text__sizer invisible [grid-area:1/1]">{longest}</span>
          <span className="kg-morphing-text__layers absolute inset-0 grid place-items-center">
            <span ref={aRef} className="kg-morphing-text__layer whitespace-nowrap [grid-area:1/1]">
              {texts[0]}
            </span>
            <span ref={bRef} className="kg-morphing-text__layer whitespace-nowrap [grid-area:1/1]" style={{ opacity: 0 }} />
          </span>
          <svg className="kg-morphing-text__defs absolute size-0" focusable="false">
            <defs>
              <filter id={filter}>
                <feColorMatrix
                  in="SourceGraphic"
                  type="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140"
                />
              </filter>
            </defs>
          </svg>
        </span>
      </Tag>
    )
  },
)

MorphingText.displayName = "MorphingText"
