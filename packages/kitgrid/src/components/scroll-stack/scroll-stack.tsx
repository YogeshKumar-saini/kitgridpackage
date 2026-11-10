"use client"

import {
  Children,
  createContext,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { canUseDOM } from "../../utils/env.js"
import { clamp } from "../../utils/math.js"

export interface ScrollStackProps extends HTMLAttributes<HTMLDivElement> {
  /** Where the first card pins, measured from the top of the scroll container. px or CSS length. */
  top?: number | string
  /** How much of each buried card's top edge stays visible, in px. */
  peek?: number
  /** Scroll distance between one card and the next, in px or a CSS length. */
  gap?: number | string
  /** How much smaller each buried layer gets, as a fraction. */
  scaleStep?: number
  /** Darken cards as they are buried. */
  dim?: boolean
}

export interface ScrollStackItemProps extends HTMLAttributes<HTMLDivElement> {}

interface StackSlot {
  index: number
  count: number
  base: string
}

const StackContext = createContext<StackSlot | null>(null)

const length = (value: number | string) =>
  typeof value === "number" ? `${value}px` : value
const timelineName = (base: string, index: number) => `--kg-stack-${base}-${index}`

/** True where CSS can drive the stack from scroll position alone. */
const supportsScrollTimeline = (): boolean =>
  canUseDOM &&
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("animation-timeline: view()") &&
  CSS.supports("timeline-scope: --kg")

const scrollParent = (node: HTMLElement): HTMLElement | null => {
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent)
    if (
      /(auto|scroll|overlay)/.test(overflowY) &&
      parent.scrollHeight > parent.clientHeight
    )
      return parent
  }
  return null
}

/**
 * Cards that pin one after another as you scroll, each settling a few pixels below the last so
 * the edges of the deck peek out, while buried cards recede: smaller, darker, tipped back.
 * Scroll-driven CSS animations do the work where supported; elsewhere a passive scroll listener
 * writes the same progress variable once per frame. Children must be `ScrollStackItem`s.
 */
export const ScrollStack = forwardRef<HTMLDivElement, ScrollStackProps>(
  (
    {
      top = 96,
      peek = 14,
      gap = 64,
      scaleStep = 0.05,
      dim = true,
      className,
      style,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const base = useId().replace(/[^a-zA-Z0-9_-]/g, "")
    const reduced = useReducedMotion()
    const [driver, setDriver] = useState<"css" | "script">("css")
    const items = Children.toArray(children).filter(isValidElement)
    const count = items.length

    useEffect(() => {
      setDriver(supportsScrollTimeline() ? "css" : "script")
    }, [])

    useEffect(() => {
      const node = local.current
      if (!node || driver !== "script" || reduced) return
      const scroller = scrollParent(node)
      let frame = 0

      const update = () => {
        frame = 0
        const cards = Array.from(
          node.querySelectorAll<HTMLElement>(":scope > .kg-scroll-stack__item"),
        )
        const markers = Array.from(
          node.querySelectorAll<HTMLElement>(":scope > .kg-scroll-stack__marker"),
        )
        const viewport = scroller
          ? scroller.getBoundingClientRect()
          : { top: 0, height: window.innerHeight }
        // Read every rect before writing anything, so the frame costs a single layout.
        const progress = cards.map((_, index) => {
          const next = markers[index + 1]
          const nextCard = cards[index + 1]
          if (!next || !nextCard) return 0
          const y = next.getBoundingClientRect().top - viewport.top
          const pinned = Number.parseFloat(getComputedStyle(nextCard).top) || 0
          const travel = viewport.height - pinned
          return travel > 0 ? clamp((viewport.height - y) / travel, 0, 1) : 1
        })
        cards.forEach((card, index) =>
          card.style.setProperty(
            "--kg-stack-progress",
            (progress[index] ?? 0).toFixed(4),
          ),
        )
      }
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(update)
      }

      let listening = false
      const listen = (on: boolean) => {
        if (on === listening) return
        listening = on
        const target: EventTarget = scroller ?? window
        if (on) {
          target.addEventListener("scroll", schedule, { passive: true })
          window.addEventListener("resize", schedule)
          schedule()
        } else {
          target.removeEventListener("scroll", schedule)
          window.removeEventListener("resize", schedule)
        }
      }
      // Only follow scrolling while the stack is on screen.
      const observer =
        typeof IntersectionObserver === "undefined"
          ? null
          : new IntersectionObserver(
              ([entry]) => listen(entry?.isIntersecting ?? false),
              {
                root: scroller,
              },
            )
      if (observer) observer.observe(node)
      else listen(true)
      update()

      return () => {
        observer?.disconnect()
        listen(false)
        cancelAnimationFrame(frame)
        for (const card of node.querySelectorAll<HTMLElement>(
          ".kg-scroll-stack__item",
        ))
          card.style.removeProperty("--kg-stack-progress")
      }
    }, [driver, reduced, count])

    return (
      <div
        ref={ref}
        role="list"
        className={cx("kg-scroll-stack group/stack relative flow-root pb-[calc(var(--_peek,14px)*3)] [timeline-scope:var(--_scope)]", className)}
        data-driver={driver}
        data-dim={dim || undefined}
        data-reduced={reduced || undefined}
        style={
          {
            "--_count": count,
            "--_top": length(top),
            "--_peek": `${peek}px`,
            "--_gap": length(gap),
            "--_step": scaleStep,
            "--_scope": Array.from({ length: count }, (_, index) =>
              timelineName(base, index),
            ).join(", "),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        {items.map((child, index) => (
          <StackContext.Provider
            key={child.key ?? index}
            value={{ index, count, base }}
          >
            {child}
          </StackContext.Provider>
        ))}
      </div>
    )
  },
)

ScrollStack.displayName = "ScrollStack"

/*
 * Paper Layers: each card is an ink-edged sheet on a crisp offset. Buried cards shrink toward the
 * final deck size for their depth and tip back a few degrees, so they turn away rather than slide
 * away; a shadow-tint overlay (a composite, not a filter) darkens them.
 */
const itemClass = cx(
  "kg-scroll-stack__item sticky mb-[var(--_gap,64px)] last:mb-0",
  "overflow-clip rounded-kg-xl border-2 border-kg-ink bg-kg-surface text-kg-fg shadow-kg-md [--_p:var(--kg-stack-progress,0)]",
  "origin-top",
  "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-[oklch(var(--kg-shadow-tint))] after:opacity-0 after:content-['']",
  "group-data-dim/stack:after:opacity-[calc(var(--_p)*min(var(--_rank,0)*0.12,0.42))]",
  "group-data-reduced/stack:relative group-data-reduced/stack:mb-4 group-data-reduced/stack:after:content-none",
  "motion-reduce:relative motion-reduce:mb-4 motion-reduce:after:content-none",
)

/** One card in a `ScrollStack`. */
export const ScrollStackItem = forwardRef<HTMLDivElement, ScrollStackItemProps>(
  ({ className, style, ...props }, ref) => {
    const slot = useContext(StackContext)
    if (!slot)
      throw new Error("<ScrollStackItem> must be a direct child of <ScrollStack>.")
    const { index, count, base } = slot
    const last = index === count - 1
    return (
      <>
        {/* An unpinned twin of the card's top edge: its view timeline tracks where the card
            would be without sticky, which is exactly what the card above needs to recede to. */}
        <div
          className="kg-scroll-stack__marker h-0 [view-timeline-axis:block] [view-timeline-name:var(--_name)]"
          aria-hidden="true"
          style={{ "--_name": timelineName(base, index) } as CSSProperties}
        />
        <div
          ref={ref}
          role="listitem"
          className={cx(itemClass, className)}
          style={
            {
              "--_i": index,
              "--_rank": count - 1 - index,
              "--_next": last ? "none" : timelineName(base, index + 1),
              ...style,
            } as CSSProperties
          }
          {...props}
        />
      </>
    )
  },
)

ScrollStackItem.displayName = "ScrollStackItem"
