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
import { useInView } from "../../hooks/use-in-view.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"
import { type TextEffectElement, tokenize } from "../text-reveal/split-text.js"

export interface ScrollTextProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** The paragraph. Assistive tech reads it once, as plain text. */
  children: string
  as?: TextEffectElement
  /** Opacity of words the reader hasn't scrolled to yet, 0–1. */
  dim?: number
  /**
   * The stretch of the paragraph's trip through the viewport over which words fill in, as
   * percentages of the `cover` range: 0 is its top touching the viewport bottom, 100 its bottom
   * leaving the top.
   */
  range?: [start: number, end: number]
}

// The same scroller `view()` resolves to, so the fallback tracks a scrolling panel, not the page.
const scrollerOf = (node: HTMLElement): HTMLElement | null => {
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    if (/(auto|scroll|overlay)/.test(getComputedStyle(parent).overflowY)) return parent
  }
  return null
}

const supportsScrollTimeline = () =>
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("animation-timeline: view()")

/**
 * A paragraph whose words fill in from faint to full as it scrolls through the viewport. Runs on
 * CSS scroll-driven animations where supported, with zero JavaScript per frame; elsewhere a
 * passive scroll listener writes a single progress variable while the paragraph is on screen.
 */
export const ScrollText = forwardRef<HTMLElement, ScrollTextProps>(
  (
    { children, as = "p", dim = 0.18, range = [10, 55], className, style, ...props },
    forwardedRef,
  ) => {
    const local = useRef<HTMLElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const reduced = useReducedMotion()
    const onScreen = useInView(local, { once: false, amount: 0, rootMargin: "25% 0px" })
    const tokens = useMemo(() => tokenize(children), [children])
    const total = tokens.filter((token) => token.type === "word").length
    const [start, end] = range

    const measure = (node: HTMLElement, scroller: HTMLElement | null) => {
      const rect = node.getBoundingClientRect()
      const port = scroller?.getBoundingClientRect()
      const top = port && scroller ? port.top + scroller.clientTop : 0
      const viewport = scroller ? scroller.clientHeight : window.innerHeight
      const cover = ((top + viewport - rect.top) / (viewport + rect.height || 1)) * 100
      const progress = clamp((cover - start) / (end - start || 1), 0, 1)
      node.style.setProperty("--_progress", progress.toFixed(4))
    }

    // Before the first paint, so a paragraph below the fold starts faint instead of flashing full.
    useIsomorphicLayoutEffect(() => {
      const node = local.current
      if (!node) return
      if (reduced || supportsScrollTimeline()) node.style.removeProperty("--_progress")
      else measure(node, scrollerOf(node))
    }, [reduced, start, end])

    useEffect(() => {
      const node = local.current
      if (!node || reduced || !onScreen || supportsScrollTimeline()) return
      const scroller = scrollerOf(node)
      let frame = 0
      const schedule = () => {
        if (!frame)
          frame = requestAnimationFrame(() => {
            frame = 0
            measure(node, scroller)
          })
      }
      measure(node, scroller)
      // Capturing on window also hears scrolls of nested panels, which don't bubble.
      window.addEventListener("scroll", schedule, { passive: true, capture: true })
      window.addEventListener("resize", schedule, { passive: true })
      return () => {
        cancelAnimationFrame(frame)
        window.removeEventListener("scroll", schedule, { capture: true })
        window.removeEventListener("resize", schedule)
      }
    }, [reduced, onScreen, start, end])

    let index = 0
    const Tag = as as ElementType

    return (
      <Tag
        ref={ref}
        className={cx("kg-scroll-text [view-timeline:--kg-scroll-text_block]", className)}
        style={
          {
            "--_dim": dim,
            "--_start": `${start}%`,
            "--_end": `${end}%`,
            "--_n": Math.max(total, 1),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <span className="kg-visually-hidden kg-scroll-text__label select-none">{children}</span>
        <span className="kg-scroll-text__text" aria-hidden="true">
          {tokens.map((token, t) =>
            token.type === "space" ? (
              token.value
            ) : (
              <span
                key={t}
                className="kg-scroll-text__word"
                style={{ "--_i": index++ } as CSSProperties}
              >
                {token.value}
              </span>
            ),
          )}
        </span>
      </Tag>
    )
  },
)

ScrollText.displayName = "ScrollText"
