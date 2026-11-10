"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useRef,
  useState,
} from "react"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { createSpring } from "../../hooks/use-spring.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { usePlayback } from "./use-playback.js"

export type MarqueeOrientation = "horizontal" | "vertical"

export interface MarqueeProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: MarqueeOrientation
  /** Travel speed in pixels per second, independent of how much content there is. */
  speed?: number
  reverse?: boolean
  /** Ease to a stop while a mouse is over the strip. */
  pauseOnHover?: boolean
  /** Stop while focus is inside, so keyboard users can reach every item. */
  pauseOnFocus?: boolean
  /** Space between items and between loops: px or any CSS length. */
  gap?: number | string
  /** Fade the leading and trailing edges. */
  fade?: boolean
  /** Minimum number of copies. More are added automatically to fill wide containers. */
  repeat?: number
}

const toLength = (value: number | string | undefined) =>
  typeof value === "number" ? `${value}px` : value

const progressOf = (animation: Animation): number => {
  const time = animation.currentTime
  const duration = animation.effect?.getTiming().duration
  if (typeof time !== "number" || typeof duration !== "number" || duration <= 0)
    return 0
  return (time % duration) / duration
}

// Duplicates are decorative: hidden from assistive tech and out of the tab order. Set as a DOM
// property because React 18 and 19 disagree on how to serialise a boolean `inert`.
const makeInert = (node: HTMLElement | null) => {
  if (node) node.inert = true
}

/**
 * An infinite, seamless strip of content. Runs on the compositor via the Web Animations API,
 * eases to a stop on hover, and becomes a plain scrollable strip under reduced motion.
 */
export const Marquee = forwardRef<HTMLDivElement, MarqueeProps>(
  (
    {
      orientation = "horizontal",
      speed = 40,
      reverse = false,
      pauseOnHover = true,
      pauseOnFocus = true,
      gap,
      fade = true,
      repeat = 2,
      className,
      style,
      tabIndex,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const trackRef = useRef<HTMLDivElement>(null)
    const reduced = useReducedMotion()
    const playing = usePlayback(local)
    const playingRef = useRef(playing)
    const minimum = Math.max(2, Math.floor(repeat))
    const [copies, setCopies] = useState(minimum)
    const animation = useRef<Animation | null>(null)
    const vertical = orientation === "vertical"

    useIsomorphicLayoutEffect(() => {
      playingRef.current = playing
      const current = animation.current
      if (!current) return
      if (playing) current.play()
      else current.pause()
    }, [playing])

    useEffect(() => {
      const root = local.current
      const track = trackRef.current
      const group = track?.firstElementChild as HTMLElement | null | undefined
      if (reduced || !root || !track || !group || typeof track.animate !== "function")
        return
      let period = 0
      let current: Animation | null = null

      const measure = () => {
        const size = vertical ? group.offsetHeight : group.offsetWidth
        if (size <= 0) return
        const viewport = vertical ? root.clientHeight : root.clientWidth
        setCopies(Math.max(minimum, Math.ceil(viewport / size) + 1))
        if (size === period) return
        period = size
        const rtl = !vertical && getComputedStyle(root).direction === "rtl"
        const end = `${rtl ? size : -size}px`
        const keyframes = vertical
          ? [{ translate: "0 0" }, { translate: `0 ${end}` }]
          : [{ translate: "0 0" }, { translate: `${end} 0` }]
        const duration = (size / Math.max(speed, 1)) * 1000

        if (!current) {
          current = track.animate(keyframes, {
            duration,
            iterations: Number.POSITIVE_INFINITY,
            direction: reverse ? "reverse" : "normal",
          })
          animation.current = current
          if (!playingRef.current) current.pause?.()
          return
        }
        // Keep the strip where it is when the content or container resizes.
        const progress = progressOf(current)
        const effect = current.effect as KeyframeEffect | null
        effect?.setKeyframes(keyframes)
        effect?.updateTiming({ duration })
        current.currentTime = progress * duration
      }

      const spring = createSpring(
        1,
        (value) => {
          if (current) current.playbackRate = Math.max(0, value)
        },
        { stiffness: 120, damping: 22 },
      )

      let hovering = false
      let focused = false
      const retarget = () =>
        spring.set((hovering && pauseOnHover) || (focused && pauseOnFocus) ? 0 : 1)
      const handleEnter = (event: PointerEvent) => {
        if (event.pointerType === "touch") return
        hovering = true
        retarget()
      }
      const handleLeave = () => {
        hovering = false
        retarget()
      }
      const handleFocusIn = () => {
        focused = true
        // Keyboard focus should not chase a moving target: stop immediately.
        if (pauseOnFocus) spring.jump(0)
      }
      const handleFocusOut = (event: FocusEvent) => {
        if (root.contains(event.relatedTarget as Node | null)) return
        focused = false
        retarget()
      }

      measure()
      const observer = new ResizeObserver(measure)
      observer.observe(root)
      observer.observe(group)
      root.addEventListener("pointerenter", handleEnter)
      root.addEventListener("pointerleave", handleLeave)
      root.addEventListener("focusin", handleFocusIn)
      root.addEventListener("focusout", handleFocusOut)
      return () => {
        observer.disconnect()
        spring.stop()
        root.removeEventListener("pointerenter", handleEnter)
        root.removeEventListener("pointerleave", handleLeave)
        root.removeEventListener("focusin", handleFocusIn)
        root.removeEventListener("focusout", handleFocusOut)
        current?.cancel?.()
        animation.current = null
      }
    }, [reduced, vertical, speed, reverse, minimum, pauseOnHover, pauseOnFocus])

    const count = reduced ? 1 : copies

    return (
      <div
        ref={ref}
        className={cx(
          "kg-marquee flex min-w-0 max-w-full overflow-hidden [--_gap:var(--kg-marquee-gap,calc(var(--kg-space)*8))]",
          "motion-reduce:overflow-auto [[data-kg-motion=reduce]_&]:overflow-auto data-reduced:overflow-auto data-reduced:overscroll-x-contain data-reduced:[scrollbar-width:thin]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
          vertical && "h-full flex-col",
          className,
        )}
        data-orientation={orientation}
        data-fade={fade || undefined}
        data-reduced={reduced || undefined}
        tabIndex={tabIndex ?? (reduced ? 0 : undefined)}
        style={
          {
            ...(gap !== undefined ? { "--kg-marquee-gap": toLength(gap) } : null),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div
          ref={trackRef}
          className={cx(
            "kg-marquee__track flex shrink-0",
            vertical ? "h-max flex-col" : "w-max",
          )}
        >
          {Array.from({ length: count }, (_, index) => (
            <div
              key={index}
              ref={index > 0 ? makeInert : undefined}
              className={cx(
                "kg-marquee__group flex shrink-0 gap-[var(--_gap)] motion-reduce:aria-hidden:hidden [[data-kg-motion=reduce]_&]:aria-hidden:hidden",
                vertical ? "flex-col items-stretch pb-[var(--_gap)]" : "items-center pe-[var(--_gap)]",
              )}
              aria-hidden={index > 0 || undefined}
            >
              {children}
            </div>
          ))}
        </div>
      </div>
    )
  },
)

Marquee.displayName = "Marquee"
