"use client"

import {
  type AnimationEvent,
  type CSSProperties,
  type ElementType,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
} from "react"
import { useEventCallback } from "../../hooks/use-event-callback.js"
import { useInView } from "../../hooks/use-in-view.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { type TextEffectElement, tokenize } from "./split-text.js"

export type TextRevealSplit = "word" | "char"
export type TextRevealEffect = "fade-up" | "blur" | "mask" | "scale"
export type TextRevealTrigger = "mount" | "view"

/* Paused during its delay, an animation holds its first keyframe: the hidden state, for free. */
const effects: Record<TextRevealEffect, string> = {
  "fade-up": "[animation-name:kg-text-reveal-fade-up] [animation-timing-function:var(--kg-ease-out)]",
  blur: "[animation-name:kg-text-reveal-blur] [animation-timing-function:var(--kg-ease-out)]",
  mask: "[animation-name:kg-text-reveal-mask] [animation-timing-function:var(--kg-ease-out)]",
  scale: "[animation-name:kg-text-reveal-scale] [animation-timing-function:var(--kg-ease-spring)]",
}

export interface TextRevealProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** The text to reveal. Assistive tech reads it once, unsplit. */
  children: string
  as?: TextEffectElement
  /** Animate whole words, or characters (words still never break across lines). */
  split?: TextRevealSplit
  effect?: TextRevealEffect
  /** Gap between consecutive pieces, in ms. Defaults to 60 for words and 22 for characters. */
  stagger?: number
  /** Wait before the first piece, in ms. */
  delay?: number
  /** Length of each piece's animation, in ms. */
  duration?: number
  /** `view` waits until the text scrolls into view, then plays once. */
  trigger?: TextRevealTrigger
  /** Fraction of the element that must be visible to start, for `trigger="view"`. */
  amount?: number
  /** Called when the last piece has finished (immediately under reduced motion). */
  onComplete?: () => void
}

/**
 * Reveals text word by word or character by character with a staggered CSS animation. The
 * animation starts from server-rendered markup, so `trigger="mount"` plays before hydration and
 * nothing runs per frame in JavaScript.
 */
export const TextReveal = forwardRef<HTMLElement, TextRevealProps>(
  (
    {
      children,
      as = "span",
      split = "word",
      effect = "fade-up",
      stagger,
      delay = 0,
      duration = 650,
      trigger = "mount",
      amount = 0.3,
      onComplete,
      className,
      style,
      onAnimationEnd,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const reduced = useReducedMotion()
    const inView = useInView(local, { once: true, amount })
    const visible = trigger === "mount" || inView || reduced
    const tokens = useMemo(() => tokenize(children), [children])
    const complete = useEventCallback(onComplete)

    useEffect(() => {
      if (visible && reduced) complete()
    }, [visible, reduced, complete])

    const total =
      split === "char"
        ? tokens.reduce((sum, token) => sum + token.chars.length, 0)
        : tokens.filter((token) => token.type === "word").length
    let index = 0

    const gap = stagger ?? (split === "char" ? 22 : 60)
    const pieceClass = cx(
      "kg-text-reveal__piece inline-block [animation-duration:var(--_duration,650ms)] [animation-fill-mode:both]",
      effects[effect],
      visible ? undefined : "[animation-play-state:paused] [@media(scripting:none)]:animate-none",
      "motion-reduce:animate-none in-data-[kg-motion=reduce]:animate-none",
    )
    const piece = (content: string, key: number) => {
      const i = index++
      return (
        <span
          key={key}
          className={pieceClass}
          data-last={i === total - 1 || undefined}
          style={{ "--_i": i, animationDelay: `${delay + i * gap}ms` } as CSSProperties}
        >
          {content}
        </span>
      )
    }

    const content: ReactNode[] = tokens.map((token, t) =>
      token.type === "space" ? (
        token.value
      ) : (
        <span
          key={t}
          className={cx(
            "kg-text-reveal__word inline-block whitespace-nowrap",
            effect === "mask" && "[clip-path:inset(-0.4em_-0.2em_-0.16em)]",
          )}
        >
          {split === "char"
            ? token.chars.map((char, c) => piece(char, c))
            : piece(token.value, 0)}
        </span>
      ),
    )

    const handleAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
      onAnimationEnd?.(event)
      if ((event.target as Element).hasAttribute("data-last")) complete()
    }

    const Tag = as as ElementType

    return (
      <Tag
        ref={ref}
        className={cx("kg-text-reveal", className)}
        data-effect={effect}
        data-split={split}
        data-trigger={trigger}
        data-state={visible ? "visible" : "hidden"}
        style={
          {
            "--_stagger": `${gap}ms`,
            "--_delay": `${delay}ms`,
            "--_duration": `${duration}ms`,
            ...style,
          } as CSSProperties
        }
        onAnimationEnd={handleAnimationEnd}
        {...props}
      >
        <span className="kg-visually-hidden kg-text-reveal__label select-none">{children}</span>
        <span className="kg-text-reveal__text" aria-hidden="true">
          {content}
        </span>
      </Tag>
    )
  },
)

TextReveal.displayName = "TextReveal"
