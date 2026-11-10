"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useRef,
} from "react"
import { useInView } from "../../hooks/use-in-view.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

/** `slide-left` travels leftward (enters from the right); `slide-right` the opposite. */
export type RevealVariant =
  "fade-up" | "fade" | "scale" | "blur" | "slide-left" | "slide-right"

export interface RevealProps extends HTMLAttributes<HTMLDivElement> {
  variant?: RevealVariant
  /** Milliseconds. */
  duration?: number
  /** Milliseconds before the reveal starts. */
  delay?: number
  /** Milliseconds between direct children. When set, children reveal one after another. */
  stagger?: number
  /** Reveal once, or hide again whenever the element leaves the viewport. */
  once?: boolean
  /** Fraction of the element that must be visible to trigger, 0–1. */
  amount?: number
  /** Travel distance for the moving variants, in px. */
  distance?: number
}

// Matches what IntersectionObserver will see: the viewport, narrowed by clipping ancestors
// such as scroll panels and carousels.
/** The hidden pre-state per variant: offsets, scale and blur the element starts from. */
const preState = (variant: RevealVariant, distance: number) => {
  switch (variant) {
    case "fade-up":
      return { y: distance }
    case "scale":
      return { y: distance * 0.25, scale: 0.94 }
    case "blur":
      return { scale: 1.015, blur: 12 }
    case "slide-left":
      return { x: distance }
    case "slide-right":
      return { x: -distance }
    default:
      return {}
  }
}

/* With stagger each direct child moves on its own; without it the wrapper moves as one. */
const motion = [
  "motion-safe:transition-[opacity,translate,scale,filter] motion-safe:duration-[var(--kg-reveal-duration)] motion-safe:ease-kg-out motion-safe:delay-[var(--_at)]",
  "motion-safe:data-[state=hidden]:opacity-0 motion-safe:data-[state=hidden]:delay-0 motion-safe:data-[state=hidden]:[translate:var(--_x)_var(--_y)] motion-safe:data-[state=hidden]:[scale:var(--_scale)] motion-safe:data-[state=hidden]:blur-[var(--_blur)]",
]
const staggered = [
  "motion-safe:*:transition-[opacity,translate,scale,filter] motion-safe:*:duration-[var(--kg-reveal-duration)] motion-safe:*:ease-kg-out motion-safe:*:delay-[var(--_at)]",
  "motion-safe:data-[state=hidden]:*:opacity-0 motion-safe:data-[state=hidden]:*:delay-0 motion-safe:data-[state=hidden]:*:[translate:var(--_x)_var(--_y)] motion-safe:data-[state=hidden]:*:[scale:var(--_scale)] motion-safe:data-[state=hidden]:*:blur-[var(--_blur)]",
]

const isOnScreen = (node: HTMLElement) => {
  const rect = node.getBoundingClientRect()
  let top = 0
  let left = 0
  let bottom = window.innerHeight
  let right = window.innerWidth
  for (let el = node.parentElement; el && el !== document.body; el = el.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(el)
    if (overflowX === "visible" && overflowY === "visible") continue
    const clip = el.getBoundingClientRect()
    top = Math.max(top, clip.top)
    left = Math.max(left, clip.left)
    bottom = Math.min(bottom, clip.bottom)
    right = Math.min(right, clip.right)
  }
  return (
    rect.bottom > top && rect.right > left && rect.top < bottom && rect.left < right
  )
}

/**
 * Reveals its content as it scrolls into view. The server always renders the content visible:
 * the hidden pre-state is applied on the client before first paint, and only to elements that
 * start offscreen, so nothing flashes, and nothing stays hidden without JavaScript.
 */
export const Reveal = forwardRef<HTMLDivElement, RevealProps>(
  (
    {
      variant = "fade-up",
      duration = 700,
      delay = 0,
      stagger,
      once = true,
      amount = 0.2,
      distance = 24,
      className,
      style,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const reduced = useReducedMotion()
    const inView = useInView(local, { once, amount })
    const seen = useRef(false)
    const start = preState(variant, distance)

    useIsomorphicLayoutEffect(() => {
      const node = local.current
      if (!node || !stagger) return
      Array.from(node.children as HTMLCollectionOf<HTMLElement>).forEach(
        (child, index) => {
          child.style.setProperty("--kg-reveal-index", String(index))
        },
      )
    })

    // Set through the DOM, not React state, so the pre-state lands before the first paint and
    // never causes a re-render. React does not own `data-state`, so it never resets it.
    useIsomorphicLayoutEffect(() => {
      const node = local.current
      if (!node || reduced || isOnScreen(node)) return
      node.dataset.state = "hidden"
    }, [])

    useEffect(() => {
      const node = local.current
      if (!node) return
      if (reduced) {
        if (node.dataset.state) node.dataset.state = "visible"
        return
      }
      if (inView) {
        seen.current = true
        if (node.dataset.state) node.dataset.state = "visible"
      } else if (!once && seen.current) {
        node.dataset.state = "hidden"
      }
    }, [inView, once, reduced])

    return (
      <div
        ref={ref}
        className={cx(
          "kg-reveal",
          stagger
            ? [staggered, "*:[--_at:calc(var(--kg-reveal-delay)+var(--kg-reveal-index,0)*var(--kg-reveal-stagger,0ms))]"]
            : [motion, "[--_at:var(--kg-reveal-delay)]"],
          className,
        )}
        data-variant={variant}
        data-stagger={stagger ? "" : undefined}
        style={
          {
            "--kg-reveal-duration": `${duration}ms`,
            "--kg-reveal-delay": `${delay}ms`,
            "--kg-reveal-distance": `${distance}px`,
            "--_x": `${start.x ?? 0}px`,
            "--_y": `${start.y ?? 0}px`,
            "--_scale": start.scale ?? 1,
            "--_blur": `${start.blur ?? 0}px`,
            ...(stagger ? { "--kg-reveal-stagger": `${stagger}ms` } : null),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    )
  },
)

Reveal.displayName = "Reveal"
