"use client"

import {
  type ElementType,
  type FocusEvent,
  forwardRef,
  type HTMLAttributes,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react"
import { useEventCallback } from "../../hooks/use-event-callback.js"
import { useInView } from "../../hooks/use-in-view.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import {
  graphemes,
  type TextEffectElement,
  tokenize,
} from "../text-reveal/split-text.js"

export type ScrambleTextTrigger = "mount" | "view" | "hover"

export interface ScrambleTextProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "children"
> {
  /** The text to decode. Assistive tech reads it once, never the noise. */
  children: string
  as?: TextEffectElement
  /** `hover` re-scrambles on pointer enter and on focus within, for links and buttons. */
  trigger?: ScrambleTextTrigger
  /** Time from the first scrambled frame until the last character settles, in ms. */
  duration?: number
  /** How often unsettled characters pick a new glyph, in ms. */
  speed?: number
  /** Glyphs to scramble through. */
  charset?: string
  /** Use the monospace font, so every glyph is exactly as wide as the one it stands in for. */
  monospace?: boolean
  /** Wait before decoding starts, in ms (mount and view only). */
  delay?: number
  /** Fraction of the element that must be visible, for `trigger="view"`. */
  amount?: number
  onComplete?: () => void
}

const charsOf = (root: HTMLElement | null) =>
  Array.from(root?.querySelectorAll<HTMLElement>(".kg-scramble-text__char") ?? [])

const DEFAULT_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&*+-<=>?@^_/\\|~"

/* Characters stay inline so kerning and shaping across them survive; a scrambled one hides its
   glyph and paints the noise glyph over it. */
const charClass = [
  "kg-scramble-text__char relative",
  "data-scrambled:text-transparent data-scrambled:[-webkit-text-fill-color:transparent]",
  "data-scrambled:after:pointer-events-none data-scrambled:after:absolute data-scrambled:after:inset-0 data-scrambled:after:text-center",
  "data-scrambled:after:text-(--_noise) data-scrambled:after:[-webkit-text-fill-color:var(--_noise)] data-scrambled:after:content-[attr(data-glyph)]",
].join(" ")

/**
 * Decodes text from random glyphs, left to right. Every original character stays in place
 * (transparent while scrambled) with its stand-in painted over it, so the width never changes
 * and line breaks never move. Frames are written to attributes, not React state.
 */
export const ScrambleText = forwardRef<HTMLElement, ScrambleTextProps>(
  (
    {
      children,
      as = "span",
      trigger = "view",
      duration = 900,
      speed = 45,
      charset = DEFAULT_CHARSET,
      monospace = false,
      delay = 0,
      amount = 0.3,
      onComplete,
      className,
      onPointerEnter,
      onFocus,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const frame = useRef(0)
    const reduced = useReducedMotion()
    const inView = useInView(local, { once: true, amount })
    const tokens = useMemo(() => tokenize(children), [children])
    const glyphs = useMemo(() => graphemes(charset), [charset])
    const complete = useEventCallback(onComplete)

    const pick = () => glyphs[Math.floor(Math.random() * glyphs.length)] ?? ""

    const settle = useCallback(() => {
      cancelAnimationFrame(frame.current)
      frame.current = 0
      for (const char of charsOf(local.current)) {
        char.removeAttribute("data-scrambled")
        char.removeAttribute("data-glyph")
      }
    }, [])

    const scrambleAll = useEventCallback(() => {
      for (const char of charsOf(local.current)) {
        char.setAttribute("data-scrambled", "")
        char.setAttribute("data-glyph", pick())
      }
    })

    const run = useEventCallback((wait: number) => {
      if (reduced || glyphs.length === 0) return
      const nodes = charsOf(local.current)
      const n = nodes.length
      if (n === 0) return
      cancelAnimationFrame(frame.current)
      scrambleAll()
      // The first character holds for 30% of the run so the noise registers before decoding.
      const settleAt = nodes.map(
        (_, i) => duration * (0.3 + 0.7 * (n === 1 ? 1 : i / (n - 1))),
      )
      let start = -1
      let shuffled = 0

      const tick = (now: number) => {
        if (start < 0) start = now + wait
        const elapsed = now - start
        const shuffle = now - shuffled >= speed
        if (shuffle) shuffled = now
        let pending = false
        for (let i = 0; i < n; i++) {
          const node = nodes[i] as HTMLElement
          if (elapsed >= (settleAt[i] as number)) {
            if (node.hasAttribute("data-scrambled")) {
              node.removeAttribute("data-scrambled")
              node.removeAttribute("data-glyph")
            }
          } else {
            pending = true
            if (shuffle) node.setAttribute("data-glyph", pick())
          }
        }
        if (pending) frame.current = requestAnimationFrame(tick)
        else {
          frame.current = 0
          complete()
        }
      }
      frame.current = requestAnimationFrame(tick)
    })

    // Mount scrambles before the first paint; view pre-scrambles so the plain text never flashes
    // just before decoding starts.
    useIsomorphicLayoutEffect(() => {
      if (reduced) {
        settle()
        return
      }
      if (trigger === "mount") run(delay)
      else if (trigger === "view" && !inView) scrambleAll()
      return settle
    }, [trigger, reduced, children, settle, run, scrambleAll])

    useEffect(() => {
      if (trigger === "view" && inView && !reduced) run(delay)
    }, [trigger, inView, reduced, children, run])

    const handlePointerEnter = (event: PointerEvent<HTMLElement>) => {
      onPointerEnter?.(event)
      if (trigger === "hover") run(0)
    }
    const handleFocus = (event: FocusEvent<HTMLElement>) => {
      onFocus?.(event)
      if (trigger === "hover") run(0)
    }

    const Tag = as as ElementType

    return (
      <Tag
        ref={ref}
        className={cx(
          "kg-scramble-text [--_noise:var(--kg-scramble-color,var(--kg-accent-strong))]",
          monospace && "font-kg-mono",
          className,
        )}
        data-trigger={trigger}
        data-monospace={monospace || undefined}
        onPointerEnter={handlePointerEnter}
        onFocus={handleFocus}
        {...props}
      >
        <span className="kg-visually-hidden kg-scramble-text__label select-none">
          {children}
        </span>
        <span className="kg-scramble-text__text" aria-hidden="true">
          {tokens.map((token, t) =>
            token.type === "space" ? (
              token.value
            ) : (
              <span key={t} className="kg-scramble-text__word inline-block whitespace-nowrap">
                {token.chars.map((char, c) => (
                  <span key={c} className={charClass}>
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

ScrambleText.displayName = "ScrambleText"
