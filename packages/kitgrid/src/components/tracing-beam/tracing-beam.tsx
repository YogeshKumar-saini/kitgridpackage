"use client"

import { forwardRef, type HTMLAttributes, useEffect, useRef } from "react"
import { useInView } from "../../hooks/use-in-view.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { createSpring } from "../../hooks/use-spring.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

export interface TracingBeamProps extends HTMLAttributes<HTMLDivElement> {
  /** Where on screen the beam's head sits, as a fraction of the viewport height. */
  anchor?: number
}

/**
 * A rail beside long-form content whose beam grows as you read, its head held at a fixed
 * height on screen. The fill eases behind the scroll with a spring; under reduced motion it
 * tracks the scroll exactly.
 */
export const TracingBeam = forwardRef<HTMLDivElement, TracingBeamProps>(
  ({ anchor = 0.45, className, children, ...props }, forwardedRef) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const reduced = useReducedMotion()
    const inView = useInView(local, { once: false, amount: 0 })

    useEffect(() => {
      const node = local.current
      if (!node || !inView) return
      const write = (p: number) => {
        node.style.setProperty("--_p", p.toFixed(4))
        if (p > 0.001) node.dataset.started = ""
        else delete node.dataset.started
      }
      const spring = createSpring(0, write, { stiffness: 120, damping: 24, precision: 0.0005 })
      let frame = 0
      const measure = () => {
        const rect = node.getBoundingClientRect()
        const head = window.innerHeight * anchor
        return Math.min(Math.max((head - rect.top) / (rect.height || 1), 0), 1)
      }
      const update = () => {
        frame = 0
        if (reduced) spring.jump(measure())
        else spring.set(measure())
      }
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(update)
      }
      spring.jump(measure())
      window.addEventListener("scroll", schedule, { passive: true })
      window.addEventListener("resize", schedule)
      return () => {
        cancelAnimationFrame(frame)
        spring.stop()
        window.removeEventListener("scroll", schedule)
        window.removeEventListener("resize", schedule)
      }
    }, [inView, reduced, anchor])

    return (
      <div
        ref={ref}
        className={cx(
          "kg-tracing-beam group/beam relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-6 [--_p:0]",
          className,
        )}
        {...props}
      >
        <span
          className="kg-tracing-beam__rail relative mt-[0.75rem] w-[2px] justify-self-center rounded-full bg-kg-border"
          aria-hidden="true"
        >
          <span className="kg-tracing-beam__fill absolute inset-0 origin-top rounded-[inherit] bg-kg-ink [transform:scaleY(var(--_p))]" />
          <span className="kg-tracing-beam__dot absolute -top-[0.75rem] left-1/2 -ml-[0.4375rem] size-[0.875rem] rounded-full border-2 border-kg-border-strong bg-kg-surface-raised shadow-kg-xs transition-colors duration-(--kg-duration-base) ease-kg-out group-data-started/beam:border-kg-ink group-data-started/beam:bg-kg-paper-sage" />
        </span>
        <div className="kg-tracing-beam__content min-w-0">{children}</div>
      </div>
    )
  },
)

TracingBeam.displayName = "TracingBeam"
