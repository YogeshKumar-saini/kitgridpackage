"use client"

import { forwardRef, useEffect, useRef } from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { NumberTicker, type NumberTickerProps } from "../number-ticker/number-ticker.js"

export interface CounterProps extends Omit<NumberTickerProps, "from" | "trigger"> {
  /** Count up from zero on mount instead of landing on the first value. */
  animateOnMount?: boolean
  /** Briefly lights the figure each time it changes, tinted by the direction of the change. */
  flash?: boolean
}

const flashClass = [
  "kg-counter rounded-kg-xs [--_flash:var(--kg-accent)]",
  "data-[flash=up]:[--_flash:var(--kg-success)] data-[flash=down]:[--_flash:var(--kg-danger)]",
  "data-flash:animate-[kg-counter-flash_var(--kg-duration-bounce)_var(--kg-ease-out)]",
  "motion-reduce:data-flash:animate-none in-data-[kg-motion=reduce]:data-flash:animate-none",
].join(" ")

/**
 * A live figure that tweens from its previous value whenever `value` changes, for KPIs that
 * refresh in place. Built on `NumberTicker`, so it formats with Intl, reserves its width and
 * exposes only the final value to assistive tech. Snaps under reduced motion.
 */
export const Counter = forwardRef<HTMLSpanElement, CounterProps>(
  (
    {
      value,
      animateOnMount = false,
      flash = true,
      duration = 650,
      className,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLSpanElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const first = useRef(value)
    const previous = useRef(value)

    useEffect(() => {
      const node = local.current
      const before = previous.current
      previous.current = value
      if (!node || !flash || before === value) return
      node.dataset.flash = value > before ? "up" : "down"
      // Drop and re-add the animation so back-to-back changes each get their own flash.
      node.style.animation = "none"
      void node.offsetWidth
      node.style.animation = ""
    }, [value, flash])

    return (
      <NumberTicker
        ref={ref}
        className={cx(flashClass, className)}
        value={value}
        from={animateOnMount ? 0 : first.current}
        trigger="mount"
        duration={duration}
        {...props}
      />
    )
  },
)

Counter.displayName = "Counter"
