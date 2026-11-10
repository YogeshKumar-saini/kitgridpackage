"use client"

import {
  type ElementType,
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useRef,
} from "react"
import { useInView } from "../../hooks/use-in-view.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import type { TextEffectElement } from "../text-reveal/split-text.js"

export type StrokeTextTrigger = "hover" | "view" | "scroll"

export interface StrokeTextProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  children: string
  as?: TextEffectElement
  /** `scroll` ties the fill to the element crossing the viewport. */
  trigger?: StrokeTextTrigger
}

/**
 * Outlined display type that fills with ink from left to right: on hover, once in view, or
 * scrubbed by scroll. The fill is a pseudo element, so the text is never duplicated in the DOM.
 */
export const StrokeText = forwardRef<HTMLElement, StrokeTextProps>(
  ({ children, as = "span", trigger = "hover", className, ...props }, forwardedRef) => {
    const local = useRef<HTMLElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const reduced = useReducedMotion()
    const inView = useInView(local, { once: true, amount: 0.6 })
    const scrubbing = trigger === "scroll" && !reduced

    useEffect(() => {
      const node = local.current
      if (!node || !scrubbing) return
      let frame = 0
      const update = () => {
        frame = 0
        const rect = node.getBoundingClientRect()
        const vh = window.innerHeight || 1
        // 0 as the element enters at the bottom, 1 by the time it reaches 40% from the top.
        const p = (vh - rect.top) / (vh * 0.6 + rect.height)
        node.style.setProperty("--_p", Math.min(Math.max(p, 0), 1).toFixed(3))
      }
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(update)
      }
      update()
      window.addEventListener("scroll", schedule, { passive: true })
      window.addEventListener("resize", schedule)
      return () => {
        cancelAnimationFrame(frame)
        window.removeEventListener("scroll", schedule)
        window.removeEventListener("resize", schedule)
        node.style.removeProperty("--_p")
      }
    }, [scrubbing])

    const Tag = as as ElementType
    const filled = reduced || (trigger === "view" && inView)

    return (
      <Tag
        ref={ref}
        className={cx(
          "kg-stroke-text relative inline-block text-transparent [--_ink:var(--kg-stroke-text-fill,var(--kg-ink))] [--_p:0] [--_stroke:var(--kg-stroke-text-color,var(--kg-fg-muted))] [-webkit-text-fill-color:transparent] [-webkit-text-stroke:var(--kg-stroke-text-width,1.5px)_var(--_stroke)] data-filled:[--_p:1] data-[trigger=hover]:hover:[--_p:1] [@media(scripting:none)]:data-[trigger=view]:[--_p:1] after:pointer-events-none after:absolute after:inset-0 after:text-(--_ink) after:[-webkit-text-fill-color:var(--_ink)] after:[-webkit-text-stroke:var(--kg-stroke-text-width,1.5px)_var(--_ink)] after:[clip-path:inset(0_calc((1_-_var(--_p))_*_100%)_0_0)] after:content-[attr(data-text)] data-[trigger=hover]:after:[transition:clip-path_var(--kg-duration-bounce)_var(--kg-ease-out)] data-[trigger=view]:after:[transition:clip-path_var(--kg-duration-bounce)_var(--kg-ease-out)]",
          className,
        )}
        data-text={children}
        data-trigger={trigger}
        data-filled={filled || undefined}
        {...props}
      >
        {children}
      </Tag>
    )
  },
)

StrokeText.displayName = "StrokeText"
