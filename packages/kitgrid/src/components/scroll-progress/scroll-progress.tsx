"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type RefObject,
  useEffect,
  useRef,
} from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

export type ScrollProgressPosition = "top" | "bottom" | "static"

export interface ScrollProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** A scrolling element to track instead of the page. */
  target?: RefObject<HTMLElement | null>
  /** `top` and `bottom` pin the bar to the viewport edge; `static` leaves it in flow. */
  position?: ScrollProgressPosition
}

const placement: Record<ScrollProgressPosition, string> = {
  top: "fixed inset-x-0 top-0 z-[var(--kg-z-sticky)]",
  bottom: "fixed inset-x-0 bottom-0 z-[var(--kg-z-sticky)]",
  static: "",
}

/**
 * A hairline bar that fills as the page, or one scroll container, is read. The fill is a
 * `scaleX` written once per scroll frame. It never animates on its own: the fill follows the
 * reader's scroll one to one with no easing, so it reads the same under reduced motion.
 * Decorative, so hidden from assistive tech.
 */
export const ScrollProgress = forwardRef<HTMLDivElement, ScrollProgressProps>(
  ({ target, position = "top", className, ...props }, forwardedRef) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)

    useEffect(() => {
      const bar = local.current
      if (!bar) return
      const scroller = target?.current ?? null
      const source: HTMLElement | Window = scroller ?? window
      let frame = 0
      const update = () => {
        frame = 0
        const el = scroller ?? document.documentElement
        const max = el.scrollHeight - el.clientHeight
        const top = scroller ? scroller.scrollTop : window.scrollY
        const p = max > 0 ? Math.min(Math.max(top / max, 0), 1) : 0
        bar.style.setProperty("--_p", p.toFixed(4))
      }
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(update)
      }
      update()
      source.addEventListener("scroll", schedule, { passive: true })
      window.addEventListener("resize", schedule)
      return () => {
        cancelAnimationFrame(frame)
        source.removeEventListener("scroll", schedule)
        window.removeEventListener("resize", schedule)
      }
    }, [target])

    return (
      <div
        ref={ref}
        className={cx(
          "kg-scroll-progress pointer-events-none h-[var(--kg-scroll-progress-height,3px)] overflow-hidden [--_p:0]",
          placement[position],
          className,
        )}
        data-position={position}
        aria-hidden="true"
        {...props}
      >
        <span className="kg-scroll-progress__bar block h-full origin-left rounded-r-full bg-kg-ink transition-none [transform:scaleX(var(--_p))]" />
      </div>
    )
  },
)

ScrollProgress.displayName = "ScrollProgress"
